import CardDeck from 'common/game/CardDeck';
import CardGame from 'common/game/CardGame';
import JassCard from './JassCard';
import JassPlayer from './JassPlayer';

export default class JassGame extends CardGame<JassPlayer, JassCard> {

    public play(): Promise<void> {
        // TODO
        throw new Error("Method not implemented.");
    }
    
    protected createDeck(): CardDeck<JassCard> {
        // TODO
        throw new Error("Method not implemented.");
    }

}
