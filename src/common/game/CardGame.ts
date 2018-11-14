import Card from 'common/game/Card';
import CardDeck from 'common/game/CardDeck';
import Player from 'common/players/Player';

export default abstract class CardGame<P extends Player, C extends Card> {
    public readonly deck: CardDeck<C>;
    public readonly players: [P];

    constructor(players: [P]) {
        this.deck = this.createDeck();
        this.players = players;
    }


    protected async broadcastGameState(): Promise<void> {
        for (const player of this.players) {
            player.sendGameState();
        }
    }


    public abstract async play(): Promise<void>;
    protected abstract createDeck(): CardDeck<C>;
}
