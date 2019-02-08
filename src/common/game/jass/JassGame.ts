import CardDeck from 'common/game/CardDeck';
import CardGame from 'common/game/CardGame';
import { JassCard, JassColor, JassType } from 'common/game/jass/JassCard';
import JassPlayer from 'common/game/jass/players/JassPlayer';
import ISerializable from 'src/common/serialize/ISerializable';
import Serializer from 'src/common/serialize/Serializer';
import JassStich from './JassStich';

export type JassGameEvent = [string, ISerializable] | string;
export interface IJassGameState {
    stich: JassStich;
    messages: ISerializable[];
    playerHandSizes: number[];
}

export default abstract class JassGame extends CardGame<JassPlayer, JassCard, IJassGameState, JassGameEvent> {

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

    protected createGameState(player: JassPlayer): IJassGameState {
        return {
            stich: [][0],
            messages: [],
            playerHandSizes: [],
        };
    }

    protected receiveMessage(player: JassPlayer, gameState: IJassGameState, message: JassGameEvent) {
        if (Array.isArray(message) && message[0] === "stichinfo") {
            gameState.stich = message[1];
        } else {
            gameState.messages.push(Serializer.serialize(message));
        }
        gameState.playerHandSizes = this.players.map(p => p.hand.cards.length);
    }

    // TODO: Delet this; it's only for backwards compatibility so JassGames that weren't updated yet still compile
    public broadcastB(...args: any[]) {
        throw new Error("Removed feature; use new broadcast API");
    }

}
