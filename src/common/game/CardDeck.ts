import Card from 'common/game/Card';
import {shuffle} from 'src/common/utils';

export default class CardDeck<C extends Card> {

    public constructor(public readonly cards: C[]) { }

    public size(): number {
        return this.cards.length;
    }

    public shuffle(): void {
        shuffle(this.cards);
    }

    public drawOne(amount: number): C {
        return this.draw()[0];
    }

    public draw(amount: number = 1): C[] {
        const res: C[] = [];
        for (let i = 0; i < amount; i++) {
            const card: C | undefined = this.cards.pop();
            if (card !== undefined) {
                res.push(card);
            }
        }
        return res;
    }


}
