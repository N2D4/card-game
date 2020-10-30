import JassCard, { JassColor, JassType } from './JassCard';

describe('JassCard', () => {
    test('.getRoesle7() returns Rösle 7', () => {
        expect(JassCard.getRoesle7()).toEqual(JassCard.getCard(JassColor.ROESLE, JassType.SIEBNER));
    });

    describe.each([
        [JassColor.SCHELLE, 0],
        [JassColor.ROESLE, 1],
        [JassColor.SCHILTE, 2],
        [JassColor.EICHEL, 3],
    ])('for each color', (color, serializedCol) => {
        describe.each([
            [JassType.SECHSER, 6],
            [JassType.SIEBNER, 7],
            [JassType.ACHTER, 8],
            [JassType.NEUNE, 9],
            [JassType.BANNER, 10],
            [JassType.UNDER, 11],
            [JassType.OBER, 12],
            [JassType.KÖNIG, 13],
            [JassType.ASS, 14],
        ])('for each type', (type, serializedType) => {
            describe('.getCard(...)', () => {
                test('returns a valid card', () => {
                    const card = JassCard.getCard(color, type);
                    expect(card.color === color);
                    expect(card.type === type);
                });

                test('always returns the same instance', () => {
                    expect(JassCard.getCard(color, type)).toBe(JassCard.getCard(color, type));
                });
            });

            describe('.getDeck()', () => {
                test('contains the card exactly once', () => {
                    const card = JassCard.getCard(color, type);
                    expect(JassCard.getDeck().cards.filter(a => a === card).length).toEqual(1);
                });
            });

            test('serializes correctly', () => {
                expect(JassCard.getCard(color, type).serialize()).toEqual([serializedCol, serializedType]);
            });
        });
    });

    test('.lexicographicCompare(...) is consistent', () => {
        const deck = JassCard.getDeck();
        deck.shuffle();
        const cards = [...deck.cards].sort(JassCard.lexicographicCompare);
        for (let i = 0; i < cards.length; i++) {
            for (let j = 0; j < i; j++) {
                expect(JassCard.lexicographicCompare(cards[j], cards[i])).toBeLessThan(0);
                expect(JassCard.lexicographicCompare(cards[i], cards[j])).toBeGreaterThan(0);
            }
            expect(JassCard.lexicographicCompare(cards[i], cards[i])).toEqual(0);
            for (let j = i + 1; j < cards.length; j++) {
                expect(JassCard.lexicographicCompare(cards[j], cards[i])).toBeGreaterThan(0);
                expect(JassCard.lexicographicCompare(cards[i], cards[j])).toBeLessThan(0);
            }
        }
    });
});