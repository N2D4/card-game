import Card from './Card';
import CardGame from './CardGame';
import Player from './Player';

class MockGame extends CardGame<Player<IGameState>, Card, IGameState, IGameState.IUpdate> {

    constructor(players: Player<IGameState>[]) {
        super(players);
        this.playRound = jest.fn(this.playRound);
        this.createGameState = jest.fn(this.createGameState);
        this.updateGameState = jest.fn(this.updateGameState);
    }

    public async playRound() {}

    public createGameState() {
        return "initial state";
    }

    public updateGameState() {}
}

class MockPlayer {
    public sendGameState = jest.fn();

    public constructor(public id: number) {}
}

describe('CardGame', () => {
    test('is created', () => {
        const p1 = new MockPlayer(1);
        const p2 = new MockPlayer(2);
        const p3 = new MockPlayer(3);
        const game = new MockGame([p1, p2, p3]);
        expect(game.players.length).toEqual(3);
    });

    test('broadcasting messages works', () => {
        const p1 = new MockPlayer(1);
        const p2 = new MockPlayer(2);
        const p3 = new MockPlayer(3);
        const game = new MockGame([p1, p2, p3]);
        const mock = jest.fn();
        game.onUpdate(mock);

        expect(mock.mock.calls).toEqual([["initial state"]]);
        expect(p1.sendGameState.mock.calls).toEqual([["initial state"]]);
        expect(p2.sendGameState.mock.calls).toEqual([["initial state"]]);
        expect(p3.sendGameState.mock.calls).toEqual([["initial state"]]); 
    });
});
