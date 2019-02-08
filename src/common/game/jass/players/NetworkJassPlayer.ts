import { JassCard } from "common/game/jass/JassCard";
import JassStichOrder from "common/game/jass/JassStichOrder";
import { JassWyys } from "common/game/jass/JassWyys";
import Serializer from "common/serialize/Serializer";
import { pseudoUUID, wait } from "common/utils";
import { Socket } from "socket.io";
import ISerializable from "src/common/serialize/ISerializable";
import JassPlayer from "./JassPlayer";

export default class NetworkJassPlayer extends JassPlayer {
    private stateWaiting: boolean = false;

    private playerSocket: Socket = [][0];   // [][0] = undefined, but doesn't make the compiler pissy
    private curState: any = undefined;
    private openQuestions: {[key: string]: [string, any]} = {};
    private questionResolvers: {[key: string]: (response: any) => void} = {};

    public constructor(playerSocket: Socket) {
        super();
        this.setSocket(playerSocket);
    }

    public setSocket(playerSocket: Socket) {
        if (this.playerSocket !== undefined) playerSocket.disconnect();
        this.playerSocket = playerSocket;
        this.sendPacket();
        this.playerSocket.on('answer', (data) => {
            const qid: number = data[0];
            if (!(qid in this.openQuestions)) {
                this.sendPacket("Invalid question ID");
                return;
            }

            delete this.openQuestions[qid];
            const resolve = this.questionResolvers[qid];
            delete this.questionResolvers[qid];
            resolve(data[1]);
        });
    }

    private sendPacketNow(additionalInfo?: ISerializable) {
        this.playerSocket.emit('gameinfo', Serializer.serialize({
            ownid: this.index,
            hand: this.hand,
            gameState: this.curState,
            openQuestions: this.openQuestions,
            additionalInfo: additionalInfo,
        }));
    }

    private async sendPacket(additionalInfo?: ISerializable) {
        await wait(0);
        this.sendPacketNow(additionalInfo);
    }

    public async sendGameState(state: any): Promise<void> {
        this.curState = state;

        // If we only just queued a state packet, don't queue again
        if (this.stateWaiting) return;
        this.stateWaiting = true;
        await wait(0);
        this.stateWaiting = false;

        this.sendPacketNow();
    }

    private async ask<T>(question: string, args: ISerializable, convertFunc: ((a: any) => T) = (a => a), acceptFunc: ((t: T) => boolean) = (a => true), additionalMessage?: string): Promise<T> {
        return new Promise<any>((resolve, reject) => {
            const uid = pseudoUUID();
            this.questionResolvers[uid] = (a) => {
                let accepted: boolean;
                let t: T = [][0];
                try {
                    t = convertFunc(a);
                    accepted = acceptFunc(t);
                } catch (e) {
                    accepted = false;
                }
                if (!accepted) {
                    this.ask(question, args, convertFunc, acceptFunc, "Response not accepted").then(resolve);
                } else {
                    resolve(t);
                }
            };
            this.openQuestions[uid] = [question, args];
            this.sendPacket(additionalMessage);
        });
    }

    private async askIntRange(question: string, rangeMin: number, rangeMax: number): Promise<number> {
        return await this.ask(question, [rangeMin, rangeMax], Number, a => a >= rangeMin && a < rangeMax && Number.isInteger(a));
    }

    private async askChoose<T>(question: string, choices: T[]): Promise<T> {
        return choices[await this.ask(question, choices, Number, a => a >= 0 && a < choices.length && Number.isInteger(a))];
    }

    public async chooseCard(choices: JassCard[]): Promise<JassCard> {
        return await this.askChoose("chooseCard", choices);
    }

    public async askForScore(rangeMin: number, rangeMax: number): Promise<number> {
        return await this.askIntRange("guessScore", rangeMin, rangeMax + 1);
    }

    public async chooseStichOrder<G, T extends JassStichOrder | G>(choices: T[]): Promise<T> {
        return await this.askChoose("chooseTrumpf", choices);
    }

    public async chooseToWyys(wyys: JassWyys[]): Promise<boolean> {
        return await this.ask("youWannaWyys", wyys, Boolean);
    }

}
