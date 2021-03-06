import CardDeck from 'common/game/CardDeck';
import CardGame from 'common/game/CardGame';
import JassCard from 'common/game/jass/JassCard';
import JassPlayer from 'common/game/jass/players/JassPlayer';
import ISerializable from 'src/common/serialize/ISerializable';
import Serializer from 'src/common/serialize/Serializer';
import JassStich from './JassStich';

export type JassGameEvent = [string, ISerializable] | string;
export interface IJassGameState {
    stich: JassStich | undefined;
    messages: ISerializable[];
    playerHandSizes: number[];
    playerNames: string[];
    turnIndicator: [number, 'green' | 'yellow'] | undefined;
}

export type Ranking = {team: JassPlayer[], score: number, totalScore: number, guessedScore?: number}[];
export type Stich = {stichWinner: JassPlayer, score: number, cardsPlayed: JassStich}

export default abstract class JassGame extends CardGame<JassPlayer, IJassGameState, JassGameEvent> {

    constructor(players: JassPlayer[]) {
        super(players);
    }

    public abstract hasEnded(): boolean

    protected async preparePlayers(): Promise<number> {
        // Prepare deck
        const deck: CardDeck<JassCard> = JassCard.getDeck();
        deck.shuffle();
        const numberOfRounds = deck.size() / this.players.length;

        // Prepare players
        await this.allPlayersIter((i, p) => p.newRound(i, deck, numberOfRounds));

        return numberOfRounds;
    }

    protected createGameState(): IJassGameState {
        return {
            stich: undefined,
            messages: [],
            playerHandSizes: this.players.map(() => 0),
            playerNames: this.players.map(p => p.getName()),
            turnIndicator: undefined,
        };
    }

    protected updateGameState(gameState: IJassGameState, message: JassGameEvent): void {
        if (Array.isArray(message) && message[0] === "stichinfo") {
            gameState.stich = message[1];
        } else if (Array.isArray(message) && message[0] === "turnindicator") {
            gameState.turnIndicator = message[1];
        } else {
            gameState.messages.push(Serializer.serialize(message));
        }
        gameState.playerHandSizes = this.players.map(p => p.hand.cards.length);
    }

    // TODO: Delet this; it's only for backwards compatibility so JassGames that weren't updated still compile
    public broadcastB(...args: any[]): never {
        throw new Error("Removed feature; use new broadcast API");
    }
    
    protected createRanking(teams: JassPlayer[][], showGuessedScore?: boolean) : Ranking {
        const sumScore = (team: JassPlayer[]) => team.reduce((s,p) => s + p.currentScore, 0);
        const sumTotalScore = (team: JassPlayer[]) => team.reduce((s,p) => s + p.totalScore, 0);
        const sumGuessedScore = (team: JassPlayer[]) => team.reduce((s,p) => s + p.guessedScore, 0);
        if (showGuessedScore === undefined || showGuessedScore === false)
            return teams.map(t => ({team: t, score: sumScore(t), totalScore: sumTotalScore(t)}));
        else 
            return teams.map(t => ({team: t, score: sumScore(t), totalScore: sumTotalScore(t), guessedScore: sumGuessedScore(t)}));
    }

    protected broadcastRanking(teams: JassPlayer[][], showGuessedScore: boolean): void {
        this.broadcast(["ranking", this.createRanking(teams, showGuessedScore)]);
    }

    protected broadcastLastStich(stich: JassStich): void {
        const lastStich = {stichWinner: stich.getWinner(), score: stich.getScore(), cardsPlayed: stich};
        this.broadcast(["last-stich", lastStich])
    }
}
