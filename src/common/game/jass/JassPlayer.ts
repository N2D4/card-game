import CardDeck from 'common/game/CardDeck';
import Player from 'common/players/Player';
import JassStichOrder from 'src/common/game/jass/JassStichOrder';
import { JassCard, JassColor, JassType } from './JassCard';
import JassHand from './JassHand';
import {JassWyys, JassWyysType} from './JassWyys';

export default abstract class JassPlayer extends Player<any> {

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


     
    public abstract async chooseCard(choices: JassCard[]): Promise<JassCard>;
    public abstract async askForScore(rangeMin: number, rangeMax: number): Promise<number>;
    public abstract async chooseStichOrder<G, T extends (JassStichOrder | G)>(choices: T[]): Promise<T>;
    
    public abstract async chooseToWyys(wyys: JassWyys): Promise<boolean>;
    public abstract async chooseWhatToWyys(wyys: JassWyys[]): Promise<JassWyys[]>;
}
