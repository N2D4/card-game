import CardDeck from 'common/game/CardDeck';
import JassStichOrder from 'src/common/game/jass/JassStichOrder';
import Player from 'src/common/game/Player';
import ISerializable from 'src/common/serialize/ISerializable';
import { JassCard, JassColor, JassType } from '../JassCard';
import { IJassGameState } from '../JassGame';
import JassHand from '../JassHand';
import {JassWyys, JassWyysType} from '../JassWyys';

export default abstract class JassPlayer extends Player<IJassGameState> {

    public hand: JassHand = new JassHand([]);
    public guessedScore: number = -1;
    public currentScore: number = -1;
    public index: number = -1;

    public async newGame(index: number, deck: CardDeck<JassCard>, numberOfCards: number): Promise<void> {
        this.index = index;
        this.currentScore = 0;
        this.guessedScore = -1;
        this.hand = new JassHand(deck.draw(numberOfCards));
    }

    public async guessScore(rangeMin: number, rangeMax: number): Promise<void> {
        this.guessedScore = await this.askForScore(rangeMin, rangeMax);
    }

    public serialize(): ISerializable {
        return this.index;
    }


     
    public abstract async chooseCard(choices: JassCard[]): Promise<JassCard>;
    public abstract async askForScore(rangeMin: number, rangeMax: number): Promise<number>;
    public abstract async chooseStichOrder<G, T extends (JassStichOrder | G)>(choices: T[]): Promise<T>;
    
    public abstract async chooseToWyys(wyys: JassWyys[]): Promise<boolean>;
}
