import { JassCard } from 'common/game/jass/JassCard';
import JassGame from 'common/game/jass/JassGame';
import JassStich from 'common/game/jass/JassStich';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import { random, wait } from 'common/utils';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';

export default class DifferenzlerJassGame extends JassGame {

    constructor(player1: JassPlayer, player2: JassPlayer, player3?: JassPlayer, player4?: JassPlayer) {
        super([player1, player2, player3, player4].filter(a => a !== undefined) as JassPlayer[]);
    }

    // TODO: Untertrumpfen
    public async play(): Promise<void> {
        // Prepare players
        const numberOfRounds: number = await this.preparePlayers();

        // Choose starting player (randomly)
        const startingPlayer = random(this.players);
        this.broadcast(["startingPlayer", startingPlayer]);
        

        // Choose Trumpf
        const trumpf: JassStichOrder = random(JassStichOrder.colors());
        this.broadcast(["trumpf", trumpf]);


        // Have all players guess scores
        await this.allPlayers(p => p.guessScore(0, 157));
        this.broadcast(["playerGuesses", this.players.map(p => p.guessedScore)]);

        // Wait for all players and animations
        await wait(1500);

        // Play the rounds
        let lastWinner: JassPlayer = startingPlayer;
        for (let i = 0; i < numberOfRounds; i++) {
            // Create the stich object
            const stich = new JassStich(trumpf);

            this.broadcast("startstich");
            for (let j = 0; j < this.players.length; j++) {
                // Broadcast the stich
                this.broadcast(["stichinfo", stich]);

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
                this.broadcast(["playcard", played]);

                // Wait for animations
                await wait(500);
            }
            lastWinner = stich.getWinner();
            const scorePlus = stich.getScore();
            lastWinner.currentScore += scorePlus;
            this.broadcast(["stichwinner", lastWinner]);
            this.broadcast(["scoreplus", [scorePlus, lastWinner]]);

            // Wait for animations
            await wait(1500);
        }


        // Last stich gives bonus points
        lastWinner.currentScore += 5;
        this.broadcast(["scoreplus", [5, lastWinner]]);


        // Create ranking
        const ranking: JassPlayer[] = [...this.players];
        ranking.sort((a, b) => Math.abs(a.currentScore - a.guessedScore) - Math.abs(b.currentScore - b.guessedScore));


        // Broadcast ranking
        this.broadcast(["ranking", ranking]);

    }

}
