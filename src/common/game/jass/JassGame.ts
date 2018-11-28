import CardDeck from 'common/game/CardDeck';
import CardGame from 'common/game/CardGame';
import { JassCard, JassColor, JassType } from 'common/game/jass/JassCard';
import JassPlayer from 'common/game/jass/players/JassPlayer';
import ISerializable from 'src/common/serialize/ISerializable';
import Serializer from 'src/common/serialize/Serializer';

export type JassGameEvent = [string, ISerializable] | string;

export default abstract class JassGame extends CardGame<JassPlayer, JassCard, ISerializable[], JassGameEvent> {

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

    protected createGameState(player: JassPlayer): ISerializable[] {
        return [];
    }

    protected receiveMessage(player: JassPlayer, gameState: ISerializable[], message: ISerializable) {
        gameState.push(Serializer.serialize(message));
    }

    // TODO: Delet this; it's only for backwards compatibility so JassGames that aren't updated yet still compile
    public broadcastB(...args: any[]) {
        throw new Error("Removed feature; use new broadcast API");
    }

}
