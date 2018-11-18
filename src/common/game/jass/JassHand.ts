import {JassCard, JassColor, JassType} from './JassCard';
import JassStich from './JassStich';

export default class JassHand {
    public constructor(public readonly cards: JassCard[]) {
        this.cards.sort(JassCard.lexicographicCompare);
    }

    public getPlayable(stich: JassStich) {
        return stich.getPlayable(this);
    }

    public add(card: JassCard): void {
        this.cards.push(card);
    }

    public remove(card: JassCard): void {
        this.cards.splice(this.cards.indexOf(card), 1);
    }

    public contains(card: JassCard): boolean {
        return this.cards.indexOf(card) >= 0;
    }
}
