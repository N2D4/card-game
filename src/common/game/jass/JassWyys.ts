import ISerializable from 'src/common/serialize/ISerializable';
import {JassCard, JassColor, JassType} from './JassCard';


export class JassWyys {
    public constructor(public readonly card: JassCard, public readonly type: JassWyysType) {
       
    }

    public static compare(a: JassWyys, b: JassWyys): number {
        if (a.getScore() === b.getScore()) {
            if (a.type === JassWyysType.FUENFBLATT && b.type === JassWyysType.VIERGLEICHE)
                return 1;
            if (a.type === JassWyysType.VIERGLEICHE && b.type === JassWyysType.FUENFBLATT)
                return -1;
            else
                return 0;
        } else 
            return a.getScore() - b.getScore();
    }
    
    public static sum(a: JassWyys[]): number {
        let res = 0;
        a.forEach(wyys => {
            res += wyys.getScore();
        });

        return res;
    }

    public serialize(): ISerializable {
        return [this.card, this.type];
    }

    public getScore(): number {
        switch (this.type) {
            case JassWyysType.DREIBLATT:
                return 20;
            case JassWyysType.VIERBLATT:
                return 50;
            case JassWyysType.VIERGLEICHE:
                return this.card.type === JassType.NEUNE ? 150
                     : this.card.type === JassType.UNDER ? 200
                     : 100;
            case JassWyysType.FUENFBLATT:
                return 100;
            default:
                return 0;
        }
    }

}

export enum JassWyysType {
    DREIBLATT, VIERBLATT, FUENFBLATT, VIERGLEICHE,
}
