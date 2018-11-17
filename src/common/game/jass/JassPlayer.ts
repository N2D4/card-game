import CardDeck from 'common/game/CardDeck';
import Player from 'common/players/Player';
import JassStichOrder from 'src/common/game/jass/JassStichOrder';
import JassCard from './JassCard';
import JassHand from './JassHand';

export default abstract class JassPlayer extends Player<string> {

    public hand: JassHand = new JassHand([]);
    public guessedScore: number = -1;
    public currentScore: number = 0;
    public index: number = -1;

    public async newGame(index: number, deck: CardDeck<JassCard>, numberOfCards: number): Promise<void> {
        this.index = index;
        this.currentScore = 0;
        this.hand = new JassHand(deck.draw(numberOfCards));
    }

    public async guessScore(rangeMin: number, rangeMax: number): Promise<void> {
        this.guessedScore = await this.askForScore(rangeMin, rangeMax);
    }

    public abstract async chooseCard(choices: JassCard[]): Promise<JassCard>;
    public abstract async askForScore(rangeMin: number, rangeMax: number): Promise<number>;
    public abstract async chooseStichOrder(choices: JassStichOrder[]): Promise<JassStichOrder>;

}
