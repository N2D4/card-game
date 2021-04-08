import ISerializable from 'src/common/serialize/ISerializable';
import JassCard, {JassColor} from './JassCard';
import JassStich from './JassStich';
import JassWyys, {JassWyysType} from './JassWyys';

export default class JassHand {
    public constructor(public readonly cards: JassCard[]) {
        this.cards.sort(JassCard.lexicographicCompare);
    }

    public serialize(): ISerializable {
        return this.cards;
    }

    public getPlayable(stich: JassStich, allowUntertrumpfen: boolean): JassCard[] {
        return stich.getPlayable(this, allowUntertrumpfen);
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

    public getWyysOptions(): JassWyys[] {
        return JassWyys.getWyyse(this.cards);
    }
}
