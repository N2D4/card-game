import Card from 'common/game/Card';
import Player from 'src/common/game/Player';
import { range } from '../utils';

export default abstract class CardGame<P extends Player<G>, C extends Card, G extends IGameState, U extends IGameState.IUpdate> {
    public readonly players: P[];
    private readonly gameStates: G[];

    constructor(players: P[]) {
        this.players = players;
        this.gameStates = [];
        for (const player of this.players) {
            this.gameStates.push(this.createGameState(player));
        }
    }

    protected async allPlayers<T>(func: (player: P) => Promise<T>): Promise<T[]> {
        return await Promise.all(this.players.map(func));
    }

    protected async allPlayersIter<T>(func: (i: number, player: P) => Promise<T>): Promise<T[]> {
        return await Promise.all([...range(this.players.length)].map(i => func(i, this.players[i])));
    }

    protected async broadcast(...messages: U[]): Promise<void> {
        for (const message of messages) {
            for (let i = 0; i < this.players.length; i++) {
                this.receiveMessage(this.players[i], this.gameStates[i], message);
                this.players[i].sendGameState(this.gameStates[i]);
            }
        }
    }


    public abstract async play(): Promise<void>;
    protected abstract createGameState(player: P): G;
    protected abstract receiveMessage(player: P, gameState: G, message: U): void;
}
