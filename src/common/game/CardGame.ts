import Card from 'common/game/Card';
import Player from 'src/common/game/Player';
import { range } from '../utils';

export default abstract class CardGame<P extends Player<G>, C extends Card, G extends IGameState, U extends IGameState.IUpdate> {
    public readonly players: P[];
    private readonly gameState: G;

    constructor(players: P[]) {
        this.players = players;
        this.gameState = this.createGameState();
    }

    protected async allPlayers<T>(func: (player: P) => Promise<T>): Promise<T[]> {
        return await Promise.all(this.players.map(func));
    }

    protected async allPlayersIter<T>(func: (i: number, player: P) => Promise<T>): Promise<T[]> {
        return await Promise.all([...range(this.players.length)].map(i => func(i, this.players[i])));
    }

    protected async broadcast(...messages: U[]): Promise<void> {
        for (const message of messages) {
            this.updateGameState(this.gameState, message);
            for (const player of this.players) {
                player.sendGameState(this.gameState);
            }
        }
    }


    public abstract async playRound(): Promise<void>;
    protected abstract createGameState(): G;
    protected abstract updateGameState(gameState: G, message: U): void;
}
