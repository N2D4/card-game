import JassCard from './JassCard';

export default abstract class JassStichOrder {

    private static Dummy = class extends JassStichOrder {
        constructor() {
            super();
        }
    }

    private static Color = class extends JassStichOrder {
        constructor(public readonly color: JassCard.Color) {
            super();
        }

        public canBeHeldBack(card: JassCard) {
            return card.color === this.color || card.type === JassCard.Type.UNDER;
        }

        public getScore(card: JassCard) {
            if (card.color == this.color) {
                if (card.type == JassCard.Type.UNDER) {
                    return 20;
                } else if (card.type == JassCard.Type.NEUNE) {
                    return 14;
                }
            }
            return super.getScore(card);
        }

        public compare(a: JassCard, b: JassCard): number {
            if (a.color === this.color) {
                if (b.color !== this.color) return 1;
                else if (a.type === b.type) return 0;
                else if (a.type === JassCard.Type.UNDER) return 1;
                else if (b.type === JassCard.Type.UNDER) return -1;
                else if (a.type === JassCard.Type.NEUNE) return 1;
                else if (b.type === JassCard.Type.NEUNE) return -1;
                return super.compare(a, b);
            }
            else if (b.color === this.color) return -this.compare(b, a);
            else return super.compare(a, b);
        }

        public colorEffective(color: JassCard.Color, firstColor: JassCard.Color): boolean {
            return color === this.color || super.colorEffective(color, firstColor);
        }
    }


    public static readonly ROESLE: JassStichOrder = new JassStichOrder.Color(JassCard.Color.ROESLE);
    public static readonly SCHELLE: JassStichOrder = new JassStichOrder.Color(JassCard.Color.SCHELLE);
    public static readonly SCHILTE: JassStichOrder = new JassStichOrder.Color(JassCard.Color.SCHILTE);
    public static readonly EICHEL: JassStichOrder = new JassStichOrder.Color(JassCard.Color.EICHEL);
    public static readonly OBENABE: JassStichOrder = new JassStichOrder.Dummy();
    public static readonly UNNEUFFE: JassStichOrder = new JassStichOrder.Dummy();
    public static readonly SLALOM: JassStichOrder = new JassStichOrder.Dummy();



    private static readonly colors_priv: JassStichOrder[] = [
        JassStichOrder.ROESLE,
        JassStichOrder.SCHELLE,
        JassStichOrder.SCHILTE,
        JassStichOrder.EICHEL,
    ];
    public static colors(): JassStichOrder[] {
        return JassStichOrder.colors_priv;
    }

    private static readonly all_priv: JassStichOrder[] = [
        JassStichOrder.OBENABE,
        JassStichOrder.UNNEUFFE,
        JassStichOrder.SLALOM,
    ].concat(JassStichOrder.colors());
    public static all(): JassStichOrder[] {
        return JassStichOrder.all_priv;
    }





    private constructor() { }

    public canBeHeldBack(card: JassCard) {
        return false;
    }

    public getScore(card: JassCard): number {
        switch (card.type) {
            case JassCard.Type.BANNER: return 10;
            case JassCard.Type.UNDER: return 2;
            case JassCard.Type.OBER: return 3;
            case JassCard.Type.KÖNIG: return 4;
            case JassCard.Type.ASS: return 11;
            default: return 0;
        }
    }

    public compare(a: JassCard, b: JassCard): number {
        return a.type - b.type;
    }

    public colorEffective(color: JassCard.Color, firstColor: JassCard.Color): boolean {
        return color === firstColor;
    }

}