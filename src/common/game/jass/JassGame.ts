import CardDeck from 'common/game/CardDeck';
import CardGame from 'common/game/CardGame';
import { random } from 'common/utils';
import JassCard from './JassCard';
import JassHand from './JassHand';
import JassStichOrder from './JassStichOrder';
import JassPlayer from './JassPlayer';
import JassStich from './JassStich';

export default class JassGame extends CardGame<JassPlayer, JassCard, any, any> {

    constructor(player1: JassPlayer, player2: JassPlayer, player3?: JassPlayer, player4?: JassPlayer) {
        super([player1, player2, player3, player4].filter(a => a !== undefined) as JassPlayer[]);
    }

    // TODO: Untertrumpfen, Schelle 7 starts
    public async play(): Promise<void> {


        // Prepare deck
        const deck: CardDeck<JassCard> = JassCard.getDeck();
        deck.shuffle();
        const numberOfRounds = deck.size() / this.players.length;


        // Prepare players
        await this.allPlayersIter((i, p) => p.newGame(i, deck, numberOfRounds));


        // Choose Trumpf
        const trumpf: JassStichOrder = random(JassStichOrder.colors());
        this.broadcast(trumpf);


        // Have all players guess scores
        await this.allPlayers(p => p.guessScore(0, 157));
        this.broadcast();


        // Play the rounds
        let lastWinner: JassPlayer = random(this.players);
        for (let i = 0; i < numberOfRounds; i++) {
            // Create and broadcast the Stich object
            const stich = new JassStich(trumpf);
            this.broadcast(stich);

            for (let i = 0; i < numberOfRounds; i++) {
                // Select player
                const player: JassPlayer = this.players[(lastWinner.index + i) % this.players.length];

                // Find playable cards
                const playable = player.hand.getPlayable(stich);

                // Ask the player which card to play
                let played: JassCard = await player.chooseCard(playable);
                
                // Add the card to the stich
                stich.add(player, played);

                // Send a broadcast signal so that game state is updated on all clients
                // We've already broadcasted the same stich object so don't need to do that again
                this.broadcast();
            }
            lastWinner = stich.getWinner();
            lastWinner.currentScore += stich.getScore();
        }


        // Last stich gives bonus points
        lastWinner.currentScore += 5;


        // Create ranking
        const ranking: JassPlayer[] = [...this.players];
        ranking.sort((a, b) => Math.abs(a.currentScore - a.guessedScore) - Math.abs(b.currentScore - b.guessedScore));


        // Broadcast ranking
        this.broadcast(ranking);

    }

    protected createGameState(player: JassPlayer, messages: any[]): any {
        return messages;
    }

}
