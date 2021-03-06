import JassCard from "common/game/jass/JassCard";
import JassStichOrder from "common/game/jass/JassStichOrder";
import JassWyys from "common/game/jass/JassWyys";
import Serializer from "common/serialize/Serializer";
import {wait, wrapThrowing, first} from "common/utils";
import ISerializable from "src/common/serialize/ISerializable";
import JassPlayer from "./JassPlayer";

type PlayerSocket = {
    disconnect(): void;
    emit(eventName: string, ...data: ISerializable[]): void;
    on(eventName: string, callback: (...data: ISerializable[]) => void): void;
}

type QuestionID = string;

type Timeout<T> = 'none' | {ms: number, value: T};


export default class NetworkJassPlayer extends JassPlayer {
    private stateWaiting = false;
    private playerSocket: PlayerSocket = undefined as any;
    private curState: any = undefined;
    private questionsAsked = 0;
    private openQuestions: Map<QuestionID, [string, any]> = new Map();
    private questionResolvers: Map<QuestionID, (response: any) => void> = new Map();

    public constructor(playerSocket: PlayerSocket, public readonly playerName: string) {
        super();
        this.setSocket(playerSocket);
    }

    public getName(): string {
        return this.playerName;
    }

    public getSocket(): PlayerSocket {
        return this.playerSocket;
    }

    public setSocket(playerSocket: PlayerSocket): void {
        if (this.playerSocket !== undefined) this.playerSocket.disconnect();
        this.playerSocket = playerSocket;
        this.sendPacket();
        this.playerSocket.on('answer', wrapThrowing((data) => {
            if (!Array.isArray(data) || data.length !== 2) throw new Error('Malformed input!');

            const qid = data[0];
            const resolve = this.questionResolvers.get(qid);
            if (resolve === undefined) {
                console.log(`Player ${this.getName()} answered question with invalid question ID ${qid}! (Example for an available ID: ${first(this.questionResolvers)[0]})`);
                this.sendPacket("Invalid question ID: " + qid);
                return;
            }

            resolve(data[1]);
        }));
    }

    private addQuestion(question: any, additionalMessage?: unknown): Promise<unknown> & {removeQuestion(): void} {
        const qid = String(this.questionsAsked++);
        this.openQuestions.set(qid, question);
        const promise: any = new Promise(resolve => {
            this.questionResolvers.set(qid, (a) => {
                promise.removeQuestion();
                resolve(a);
            });
        });
        Object.defineProperty(promise, 'removeQuestion', {
            enumerable: false,
            value: () => {
                this.openQuestions.delete(qid);
                this.questionResolvers.delete(qid);
            }
        });
        this.sendPacket(additionalMessage);
        return promise;
    }

    private sendPacketNow(additionalInfo?: ISerializable) {
        this.playerSocket.emit('gameinfo', Serializer.serialize({
            isSpectating: false,
            ownid: this.index,
            hand: this.hand,
            gameState: this.curState,
            openQuestions: Object.fromEntries(this.openQuestions.entries()),
            additionalInfo: additionalInfo,
        }));
    }

    private async sendPacket(additionalInfo?: ISerializable) {
        await wait(0);  // process rest of this method at the end of event queue
        this.sendPacketNow(additionalInfo);
    }

    public async sendGameState(state: unknown): Promise<void> {
        this.curState = state;

        // If we only just queued a state packet, don't queue again
        if (this.stateWaiting) return;
        this.stateWaiting = true;
        await wait(0);
        this.stateWaiting = false;

        this.sendPacketNow();
    }

    private async ask<T>(
        question: string,
        args: ISerializable,
        timeout: Timeout<T> | Promise<T>,
        convertFunc: ((a: any) => T) = (a => a),
        acceptFunc: ((t: T) => boolean) = (a => true),
        additionalMessage?: ISerializable,
    ): Promise<T> {
        if (timeout === 'none') timeout = new Promise(() => undefined); // never resolves
        else if ('ms' in timeout && 'value' in timeout) timeout = wait(timeout.ms, timeout.value);

        const questionPromise = this.addQuestion([question, args], additionalMessage);
        const playerAnswerPromise = (async () => {
            const a = await questionPromise;
            try {
                const t = convertFunc(a);
                if (acceptFunc(t)) return t;
            } catch (e) {
                console.error('error accepting request', e);
                // do nothing...
            }
            return this.ask(
                question,
                args,
                timeout,
                convertFunc,
                acceptFunc,
                ["Response not accepted", { question: [question, args], response: a }]
            );
        })();

        const timeoutPromise = (async () => {
            const res = await timeout;
            questionPromise.removeQuestion();
            return res;
        })();

        return await Promise.race([playerAnswerPromise, timeoutPromise]);
    }

    private async askIntRange(question: string, rangeMin: number, rangeMax: number, timeout: Timeout<number>): Promise<number> {
        return await this.ask(
            question,
            [rangeMin, rangeMax],
            timeout,
            Number,
            a => a >= rangeMin && a < rangeMax && Number.isInteger(a)
        );
    }

    private async askChoose<T>(question: string, choices: T[], timeout: Timeout<T>): Promise<T> {
        const chosen = await this.ask(
            question,
            choices,
            timeout === 'none' ? 'none' : {ms: timeout.ms, value: -1},
            a => Number(a),
            a => a >= 0 && a < choices.length && Number.isInteger(a),
        );
        if (chosen === -1 && timeout !== 'none') return timeout.value;
        return choices[chosen];
    }

    public async chooseCard(choices: JassCard[]): Promise<JassCard> {
        return await this.askChoose("chooseCard", choices, {ms: 45000, value: choices[0]});
    }

    public async askForScore(rangeMin: number, rangeMax: number): Promise<number> {
        return await this.askIntRange("guessScore", rangeMin, rangeMax + 1, {ms: 90000, value: 40});
    }

    public async chooseStichOrder<G, T extends JassStichOrder | G>(choices: T[]): Promise<T> {
        return await this.askChoose("chooseTrumpf", choices, {ms: 60000, value: choices[0]});
    }

    public async chooseToWyys(wyys: JassWyys[]): Promise<boolean> {
        return await this.ask("youWannaWyys", wyys, {ms: 30000, value: true}, a => Boolean(a));
    }

}