import Card from './Card';
import CardDeck from './CardDeck';

class ExCard extends Card {
    public constructor(public a: number) {
        super();
    }
}
const c1 = new ExCard(1);
const c2 = new ExCard(2);
const c3 = new ExCard(3);
const c4 = new ExCard(4);

describe('CardDeck', () => {
    test('.size() returns size', () => {
        expect(new CardDeck([c1, c2, c3]).size()).toEqual(3);
        expect(new CardDeck([]).size()).toEqual(0);
    });

    test('.drawOne() returns one card', () => {
        const deck = new CardDeck([c1, c2, c3]);
        expect(deck.drawOne()).toBe(c3);
        expect(deck.cards).toEqual([c1, c2]);
    });

    test('.draw() returns cards', () => {
        const deck = new CardDeck([c1, c2, c3, c4]);

        expect(deck.draw(2)).toEqual([c3, c4]);
        expect(deck.cards).toEqual([c1, c2]);

        expect(deck.draw(1)).toEqual([c2]);
        expect(deck.cards).toEqual([c1]);

        expect(() => deck.draw(2)).toThrow();
        expect(deck.cards).toEqual([c1]);

        expect(deck.draw(1)).toEqual([c1]);
        expect(deck.cards).toEqual([]);
    });
});
