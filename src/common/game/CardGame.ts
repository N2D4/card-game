import Card from 'common/game/Card';
import Player from 'src/common/game/Player';
import { range } from '../utils';

export default abstract class CardGame<P extends Player<G>, C extends Card, G extends IGameState, U extends IGameState.IUpdate> {
    public readonly updateHandlers: ((state: G) => void)[];
    private gameState: G = undefined as any;

    constructor(public readonly players: P[]) {
        this.updateHandlers = this.players.map(p => ((state: G) => void p.sendGameState(state)));
        this.resetGameState();
        this.broadcastGameState();
    }

    public onUpdate(handler: (state: G) => void) {
        this.updateHandlers.push(handler);
        handler(this.gameState);
    }

    protected resetGameState() {
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
        }
        this.broadcastGameState();
    }
    
    private broadcastGameState() {
        for (const handler of this.updateHandlers) {
            handler(this.gameState);
        }
    }


    public abstract async playRound(): Promise<void>;
    protected abstract createGameState(): G;
    protected abstract updateGameState(gameState: G, message: U): void;
}
