import Card from 'common/game/Card';
import Player from 'common/players/Player';
import JassStichOrder from 'src/common/game/jass/JassStichOrder';

export default abstract class JassPlayer extends Player {
    public abstract chooseCard(choices: [Card]): number;
    public abstract guessScore(rangeMin: number, rangeMax: number): number;
    public abstract chooseStichOrder(choices: [JassStichOrder]): number;
}
