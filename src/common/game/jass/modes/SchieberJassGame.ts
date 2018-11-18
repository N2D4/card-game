import CardDeck from 'common/game/CardDeck';
import { JassCard } from 'common/game/jass/JassCard';
import JassGame from 'common/game/jass/JassGame';
import JassHand from 'common/game/jass/JassHand';
import JassPlayer from 'common/game/jass/JassPlayer';
import JassStich from 'common/game/jass/JassStich';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import { random } from 'common/utils';

export default class SchieberJassGame extends JassGame {

    constructor(player1: JassPlayer, player2: JassPlayer, player3: JassPlayer, player4: JassPlayer, private startingPlayer?: JassPlayer) {
        super([player1, player2, player3, player4]);
    }

    // TODO: Untertrumpfen, Schelle 7 starts
    public async play(): Promise<void> {
        const numberOfRounds = await this.preparePlayers();

        // find player with roesle 7 if starting player is undefined
        if (this.startingPlayer === undefined)
            this.startingPlayer = this.players.filter(p => p.hand.contains(JassCard.getRoesle7()))[0];
        this.broadcast(this.startingPlayer);
        
        // Choose Trumpf
        const order: Array<JassStichOrder | "schieb"> = [...JassStichOrder.getSchieberStichOrder()];
        order.push("schieb");
        let trumpf: (JassStichOrder | "schieb") = await this.startingPlayer.chooseStichOrder(order);
        this.broadcast(trumpf);

        // if first player chose schieb, player 2 selects new trumpf
        if (trumpf === "schieb") {
            trumpf = await this.players[(this.startingPlayer.index + 2) % this.players.length].chooseStichOrder(JassStichOrder.getSchieberStichOrder());
            this.broadcast(trumpf);
        }

        // Play the rounds
        let lastWinner: JassPlayer = this.startingPlayer;
        for (let i = 0; i < numberOfRounds; i++) {
            // Create and broadcast the Stich object
            const stich = new JassStich(trumpf);
            this.broadcast(stich);

            for (let j = 0; j < this.players.length; j++) {
                // Select player
                const player: JassPlayer = this.players[(lastWinner.index + j) % this.players.length];

                // Find playable cards
                const playable = player.hand.getPlayable(stich);

                // Ask the player which card to play
                const played: JassCard = await player.chooseCard(playable);
                
                // Remove the card from the hand and add it to the stich
                player.hand.remove(played);
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
        const ranking: Array<{score: number, players: JassPlayer[]}> = [];
        ranking.push({score: trumpf.getScoreMultiplier() * (this.players[0].currentScore + this.players[2].currentScore), players: [this.players[0], this.players[2]]});
        ranking.push({score: trumpf.getScoreMultiplier() * (this.players[1].currentScore + this.players[3].currentScore), players: [this.players[1], this.players[3]]});
        ranking.sort((a, b) => a.score - b.score);


        // Broadcast ranking
        this.broadcast(ranking);
        this.broadcast(trumpf.getScoreMultiplier());


        // Next player
        this.startingPlayer = this.players[(this.startingPlayer.index + 1) % this.players.length];

    }
}
