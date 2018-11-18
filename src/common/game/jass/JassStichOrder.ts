import {JassCard, JassColor, JassType} from './JassCard';

export default abstract class JassStichOrder {

    private static Dummy = class extends JassStichOrder { };

    private static Obenabe = class extends JassStichOrder {
        public getScore(card: JassCard) {
            if (card.type === JassType.ACHTER) {
                return 8;
            }
            return super.getScore(card);
        }

        public getScoreMultiplier(): number {
            return 3;
        }
    };

    private static Unneuffe = class extends JassStichOrder {
        public getScore(card: JassCard) {
            switch (card.type) {
                case JassType.ACHTER: return 8;
                case JassType.ASS: return 0;
                case JassType.SECHSER: return 11;
                default: return super.getScore(card);
            }
        }

        public compare(a: JassCard, b: JassCard): number {
            return -super.compare(a, b);                        
        }

        public getScoreMultiplier(): number {
            return 3;
        }
    };

    private static Color = class extends JassStichOrder {
        constructor(public readonly color: JassColor) {
            super();
        }

        public canBeHeldBack(card: JassCard) {
            return card.color === this.color || card.type === JassType.UNDER;
        }

        public getScore(card: JassCard) {
            if (card.color === this.color) {
                if (card.type === JassType.UNDER) {
                    return 20;
                } else if (card.type === JassType.NEUNE) {
                    return 14;
                }
            }
            return super.getScore(card);
        }

        public compare(a: JassCard, b: JassCard): number {
            if (a.color === this.color) {
                if (b.color !== this.color) return 1;
                else if (a.type === b.type) return 0;
                else if (a.type === JassType.UNDER) return 1;
                else if (b.type === JassType.UNDER) return -1;
                else if (a.type === JassType.NEUNE) return 1;
                else if (b.type === JassType.NEUNE) return -1;
                return super.compare(a, b);
            } else if (b.color === this.color) return -this.compare(b, a);
            else return super.compare(a, b);
        }

        public colorEffective(color: JassColor, firstColor: JassColor): boolean {
            return color === this.color || super.colorEffective(color, firstColor);
        }

        public getScoreMultiplier(): number {
            return (this.color === JassColor.SCHILTE || this.color === JassColor.SCHELLE) ? 2 : 1;
        }
    };


    public static readonly ROESLE: JassStichOrder = new JassStichOrder.Color(JassColor.ROESLE);
    public static readonly SCHELLE: JassStichOrder = new JassStichOrder.Color(JassColor.SCHELLE);
    public static readonly SCHILTE: JassStichOrder = new JassStichOrder.Color(JassColor.SCHILTE);
    public static readonly EICHEL: JassStichOrder = new JassStichOrder.Color(JassColor.EICHEL);
    public static readonly OBENABE: JassStichOrder = new JassStichOrder.Obenabe();
    public static readonly UNNEUFFE: JassStichOrder = new JassStichOrder.Unneuffe();
    public static readonly SLALOM: JassStichOrder = new JassStichOrder.Dummy();



    private static readonly colorspriv: JassStichOrder[] = [
        JassStichOrder.ROESLE,
        JassStichOrder.SCHELLE,
        JassStichOrder.SCHILTE,
        JassStichOrder.EICHEL,
    ];
    private static readonly allpriv: JassStichOrder[] = [
        JassStichOrder.OBENABE,
        JassStichOrder.UNNEUFFE,
        JassStichOrder.SLALOM,
    ].concat(JassStichOrder.colors());





    private constructor() { }
    
    public static colors(): JassStichOrder[] {
        return JassStichOrder.colorspriv;
    }
    public static all(): JassStichOrder[] {
        return JassStichOrder.allpriv;
    }

    public static getSchieberStichOrder(): JassStichOrder[] {
        return [JassStichOrder.OBENABE, JassStichOrder.UNNEUFFE].concat(JassStichOrder.colors());
    }

    public canBeHeldBack(card: JassCard) {
        return false;
    }

    public getScore(card: JassCard): number {
        switch (card.type) {
            case JassType.BANNER: return 10;
            case JassType.UNDER: return 2;
            case JassType.OBER: return 3;
            case JassType.KÖNIG: return 4;
            case JassType.ASS: return 11;
            default: return 0;
        }
    }

    public compare(a: JassCard, b: JassCard): number {
        return a.type - b.type;
    }

    public colorEffective(color: JassColor, firstColor: JassColor): boolean {
        return color === firstColor;
    }

    public getScoreMultiplier(): number {
        return 1;
    }

}
