import Card from "common/game/Card";
import { range } from "common/utils";
import CardDeck from "../CardDeck";


export class JassCard extends Card {
    public static readonly COLORS: JassColor[] = [...range(0, 4)];
    public static readonly TYPES: JassType[] = [...range(6, 15)];
    private static readonly instances: JassCard[][] = JassCard.COLORS.map(a => []);

    private constructor(public readonly color: JassColor, public readonly type: JassType) {
        super();
    }


    public static getCard(color: JassColor, type: JassType): JassCard {
        return this.instances[color][type - JassType.SECHSER]
           || (this.instances[color][type - JassType.SECHSER] = new JassCard(color, type));
    }

    public static getDeck(): CardDeck<JassCard> {
        const res: JassCard[] = [];
        for (const color of JassCard.COLORS) {
            for (const type of JassCard.TYPES) {
                res.push(this.getCard(color, type));
            }
        }
        return new CardDeck<JassCard>(res);
    }

    public static lexicographicCompare(a: JassCard, b: JassCard): number {
        if (a.color !== b.color) {
            return a.color - b.color;
        } else {
            return a.type - b.type;
        }
    }
}


export enum JassColor {
    SCHELLE = 0,
    ROESLE = 1,
    SCHILTE = 2,
    EICHEL = 3,
}

export enum JassType {
    SECHSER = 6,
    SIEBNER = 7,
    ACHTER = 8,
    NEUNE = 9,
    BANNER = 10,
    UNDER = 11,
    OBER = 12,
    KÖNIG = 13,
    ASS = 14,
}
