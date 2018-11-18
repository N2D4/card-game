import CardDeck from 'common/game/CardDeck';
import CardGame from 'common/game/CardGame';
import { JassCard, JassColor, JassType } from 'common/game/jass/JassCard';
import JassPlayer from 'common/game/jass/JassPlayer';

export default abstract class JassGame extends CardGame<JassPlayer, JassCard, any, any> {

    constructor(players: JassPlayer[]) {
        super(players);
    }

    protected async preparePlayers(): Promise<number> {
        // Prepare deck
        const deck: CardDeck<JassCard> = JassCard.getDeck();
        deck.shuffle();
        const numberOfRounds = deck.size() / this.players.length;

        // Prepare players
        await this.allPlayersIter((i, p) => p.newGame(i, deck, numberOfRounds));

        return numberOfRounds;
    }

    protected createGameState(player: JassPlayer, messages: any[]): any {
        // TODO Improve this
        return [messages, player];
    }

}
