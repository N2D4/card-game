import JassCard from './JassCard';
import JassStich from './JassStich';

export default class JassHand {
    public constructor(public readonly cards: JassCard[]) {
        this.cards.sort(JassCard.lexicographicCompare);
    }

    public getPlayable(stich: JassStich) {
        return stich.getPlayable(this);
    }
}