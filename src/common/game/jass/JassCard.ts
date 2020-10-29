import Card from "common/game/Card";
import { range } from "common/utils";
import ISerializable from "src/common/serialize/ISerializable";
import CardDeck from "../CardDeck";


export default class JassCard extends Card {
    public static readonly COLORS: JassColor[] = [...range(0, 4)];
    public static readonly TYPES: JassType[] = [...range(6, 15)];
    private static readonly instances: (JassCard | null)[][] = JassCard.COLORS.map(a => JassCard.TYPES.map(b => null));

    private constructor(public readonly color: JassColor, public readonly type: JassType) {
        super();
        if (JassCard.instances[color][type] ?? null !== null) {
            throw new Error("JassCard constructor is private");
        }
    }


    public static getCard(color: JassColor, type: JassType): JassCard {
        return this.instances[color][type - JassType.SECHSER] ??= new JassCard(color, type);
    }

    public static getRoesle7(): JassCard {
        return JassCard.getCard(JassColor.ROESLE, JassType.SIEBNER);
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

    public serialize(): ISerializable {
        return [this.color, this.type];
    }

    public toString(): string {
        return `${this.color.toString()} ${this.type.toString()}`;
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
