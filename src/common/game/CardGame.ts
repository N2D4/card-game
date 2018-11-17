import Card from 'common/game/Card';
import Player from 'common/players/Player';
import { range } from '../utils';

export default abstract class CardGame<P extends Player<G>, C extends Card, G extends IGameState, U extends IGameState.IUpdate> {
    public readonly players: P[];
    private readonly messages: U[] = [];

    constructor(players: P[]) {
        this.players = players;
    }

    protected async allPlayers<T>(func: (player: P) => Promise<T>): Promise<T[]> {
        return await Promise.all(this.players.map(func));
    }

    protected async allPlayersIter<T>(func: (i: number, player: P) => Promise<T>): Promise<T[]> {
        return await Promise.all([...range(this.players.length)].map(i => func(i, this.players[i])));
    }

    protected async broadcast(...messages: U[]): Promise<void> {
        for (const message of messages) {
            this.messages.push(message);
        }
        this.allPlayers(player => player.sendGameState(this.createGameState(player, this.messages)));
    }


    public abstract async play(): Promise<void>;
    protected abstract createGameState(player: P, messages: U[]): G;
}
