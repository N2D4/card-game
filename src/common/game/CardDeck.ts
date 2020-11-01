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

    public drawOne(): C {
        return this.draw()[0];
    }

    public draw(amount = 1): C[] {
        if (amount > this.cards.length) {
            throw new Error(`Can't draw this many cards!`);
        }
        return this.cards.splice(this.cards.length - amount);
    }


}
