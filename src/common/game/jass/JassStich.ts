import ISerializable from 'src/common/serialize/ISerializable';
import {JassCard, JassColor, JassType} from './JassCard';
import JassHand from './JassHand';
import JassStichOrder from './JassStichOrder';
import JassPlayer from './players/JassPlayer';

export default class JassStich {
    public readonly cards: Array<{player: JassPlayer, card: JassCard}> = [];

    public constructor(public readonly trumpf: JassStichOrder) { }

    public serializable(): ISerializable {
        return this.cards;
    }

    public size(): number {
        return this.cards.length;
    }

    public firstColor(): JassColor | undefined {
        return this.size() <= 0 ? undefined : this.cards[0].card.color;
    }

    public add(player: JassPlayer, card: JassCard): void {
        this.cards.push({player, card});
    }

    public getPlayable(hand: JassHand): JassCard[] {
        let playable: JassCard[] = [];
        const firstCol = this.firstColor();
        if (firstCol !== undefined) {
            playable = hand.cards.filter(a => this.trumpf.colorEffective(a.color, firstCol));
        }
        if (playable.filter(a => this.trumpf.canBeHeldBack(a)).length <= 0) {
            playable = [...hand.cards];
        }
        return playable;
    }

    public getWinner(): JassPlayer {
        const firstColor: JassColor = this.firstColor() as JassColor;
        let best: {player: JassPlayer, card: JassCard} = this.cards[0];
        for (let i = 1; i < this.size(); i++) {
            const cur = this.cards[i];
            if (this.trumpf.colorEffective(cur.card.color, firstColor)) {
                if (this.trumpf.compare(best.card, cur.card) < 0) {
                    best = cur;
                }
            }
        }
        return best.player;
    }

    public getScore(): number {
        return this.cards.map(a => this.trumpf.getScore(a.card)).reduce((a, b) => a + b);
    }

    


}
