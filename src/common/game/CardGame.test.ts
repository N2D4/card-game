import Card from './Card';
import CardGame from './CardGame';
import Player from './Player';

class MockGame extends CardGame<Player<IGameState>, Card, IGameState, IGameState.IUpdate> {
    public playRound = jest.fn(async () => {});
    public createGameState = jest.fn(() => "initial state");
    public updateGameState = jest.fn(() => {});
}

class MockPlayer {
    public sendGameState = jest.fn();

    public constructor(public id: number) {}
}

describe('CardGame', () => {
    const p1 = new MockPlayer(1);
    const p2 = new MockPlayer(2);
    const p3 = new MockPlayer(3);

    test('is created', () => {
        const game = new MockGame([p1, p2, p3]);
        expect(game.players.length).toEqual(3);

        expect(game.playRound.mock.calls.length).toEqual(0);
        expect(game.createGameState.mock.calls.length).toEqual(1);
        expect(game.updateGameState.mock.calls.length).toEqual(0);
    });

    test('broadcasting messages works', () => {
        const game = new MockGame([p1, p2, p3]);
        const mock = jest.fn();
        game.onUpdate(mock);

        expect(mock.mock.calls).toEqual([["initial state"]]);
        expect(p1.sendGameState.mock.calls).toEqual([["initial state"]]);
        expect(p2.sendGameState.mock.calls).toEqual([["initial state"]]);
        expect(p3.sendGameState.mock.calls).toEqual([["initial state"]]); 
    });
});
