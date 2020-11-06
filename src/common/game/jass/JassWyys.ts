import ISerializable from 'src/common/serialize/ISerializable';
import JassCard, {JassColor, JassType} from './JassCard';
import JassStichOrder from './JassStichOrder';


export default class JassWyys {
    private constructor(
        public readonly type: JassWyysType,
        public readonly cards: JassCard[],
        public readonly score: number,
    ) {
        // Quite dusty here...
    }

    public static getWyyse(cards: JassCard[]): JassWyys[] {
        const res: JassWyys[] = [];
        for (const color of JassCard.COLORS) {
            res.push(...this.getBlaetter(cards, color));
        }
        for (const type of JassCard.TYPES) {
            res.push(...this.getGleiche(cards, type));
        }
        return res;
    }

    private static getBlaetter(cards: JassCard[], color: JassColor): JassWyys[] {
        const res: JassWyys[] = [];
        const sorted = cards.filter(a => a.color === color).sort((a, b) => JassCard.lexicographicCompare(a, b));
        let blatt = [];
        for (const c of sorted) {
            if (blatt.length > 0 && !JassCard.isNeighbour(blatt[blatt.length - 1], c)) {
                if (blatt.length >= 3) {
                    const score = blatt.length === 3 ? 20 : blatt.length * 50 - 150;
                    res.push(new JassWyys(JassWyysType.BLATT, blatt, score));
                }
                blatt = [];
            }
            blatt.push(c);
        }
        return res;
    }

    private static getGleiche(cards: JassCard[], type: JassType): JassWyys[] {
        const ncards = cards.filter(a => a.type === type);
        return ncards.length >= 4 ? [
            new JassWyys(
                JassWyysType.GLEICHE,
                ncards,
                ncards.length * 50 - 100,
            )
        ] : [];
    }

    /**
     * Returns a function which returns a positive number if `a` is a better wyys than `b`, a negative number if `b` is
     * a better wyys than `a`, and 0 otherwise.
     */
    public static getComparator(stichOrder: JassStichOrder): (a: JassWyys, b: JassWyys) => number {
        return (a, b) => {
            if (a.score === b.score) {
                if (a.type === JassWyysType.BLATT && b.type === JassWyysType.GLEICHE) {
                    return 1;
                } else if (a.type === JassWyysType.GLEICHE && b.type === JassWyysType.BLATT) {
                    return -1;
                } else {
                    const dif = a.getHighestCard(stichOrder).type - b.getHighestCard(stichOrder).type;
                    if (dif !== 0) {
                        return dif;
                    }
                    // TODO should we check the players' hands for the highest card in Trumpf color here instead?
                    // ie. if a player holds Trumpf Ober and the Wyys is up to Ober in another color, should the
                    // player's Wyys take priority?
                    // Check Jass rules to be sure
                    return Number(a.isTrumpf(stichOrder)) - Number(b.isTrumpf(stichOrder));
                }
            } else {
                return a.score - b.score;
            }
        };
    }
    
    public static sum(a: JassWyys[]): number {
        let res = 0;
        a.forEach(wyys => {
            res += wyys.score;
        });

        return res;
    }

    public getHighestCard(stichOrder: JassStichOrder): JassCard {
        return stichOrder.max(...this.cards);
    }

    public isTrumpf(stichOrder: JassStichOrder): boolean {
        return this.cards.some(a => stichOrder.isTrumpfColor(a.color));
    }

    public serialize(): ISerializable {
        return {
            cards: this.cards,
            type: this.type,
            score: this.score,
        };
    }

}

export enum JassWyysType {
    BLATT = 'blatt',
    GLEICHE = 'gleiche',
}
