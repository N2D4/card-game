import Card from "common/game/Card";
import { range } from "common/utils";
import CardDeck from "../CardDeck";


class JassCard extends Card {
    public static readonly COLORS: JassCard.Color[] = [...range(0, 3)];
    public static readonly TYPES: JassCard.Type[] = [...range(6, 14)];
    private static readonly instances: JassCard[][];

    private constructor(public readonly color: JassCard.Color, public readonly type: JassCard.Type) {
        super();
    }


    public static getCard(color: JassCard.Color, type: JassCard.Type): JassCard {
        return this.instances[color][type - JassCard.Type.SECHSER]
           || (this.instances[color][type - JassCard.Type.SECHSER] = new JassCard(color, type));
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


declare namespace JassCard {
    export enum Color {
        SCHELLE = 0,
        ROESLE = 1,
        SCHILTE = 2,
        EICHEL = 3,
    }

    export enum Type {
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
}



export default JassCard;
