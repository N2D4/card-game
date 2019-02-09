import ISerializable from 'src/common/serialize/ISerializable';
import {JassCard, JassColor, JassType} from './JassCard';
import JassStich from './JassStich';
import {JassWyys, JassWyysType} from './JassWyys';

export default class JassHand {
    public constructor(public readonly cards: JassCard[]) {
        this.cards.sort(JassCard.lexicographicCompare);
    }

    public serialize(): ISerializable {
        return this.cards;
    }

    public getPlayable(stich: JassStich, allowUntertrumpfen: boolean) {
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
        const cards: JassCard[] = [...this.cards];
        cards.sort(JassCard.lexicographicCompare);

        const wyys: JassWyys[] = [];
        const count: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

        let l = 1;
        for (let i = 1; i < cards.length; i++) {
            // find sequence of same color
            if (cards[i].color === cards[i - 1].color && cards[i].type === cards[i - 1].type + 1)
                l++;
            else 
                l = 1;
            
            // add 3,4 or 5 Blatt
            if (l === 3)
                wyys.push(new JassWyys(cards[i], JassWyysType.DREIBLATT));
            if (l === 4)
                wyys.push(new JassWyys(cards[i], JassWyysType.VIERBLATT));
            if (l === 5)
                wyys.push(new JassWyys(cards[i], JassWyysType.FUENFBLATT));
            
            // increase count of same card
            count[cards[i].type - 6]++;
        }

        for (let i = 0; i < 9; i++) {
            if (count[i] === 4)
                wyys.push(new JassWyys(JassCard.getCard(JassColor.EICHEL, i + 6), JassWyysType.VIERGLEICHE));
        }

        return wyys;
    }
}
