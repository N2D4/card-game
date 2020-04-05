import { JassCard } from 'common/game/jass/JassCard';
import JassGame from 'common/game/jass/JassGame';
import JassStich from 'common/game/jass/JassStich';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import { random, wait } from 'common/utils';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';

export default class DifferenzlerJassGame extends JassGame {
    public readonly teams = this.players.map(p => [p]);
    private roundCount = 0; // one-based

    constructor(player1: JassPlayer, player2: JassPlayer, player3?: JassPlayer, player4?: JassPlayer) {
        super([player1, player2, player3, player4].filter(a => a !== undefined) as JassPlayer[]);
    }

    public hasEnded(): boolean {
        return this.roundCount >= 12;
    }

    public async playRound(): Promise<void> {
        if (this.hasEnded()) throw new Error(`Game has ended!`);

        this.broadcast(["gameType", "differenzler"]);

        this.roundCount++;
        this.resetGameState();

        // Prepare players
        const numberOfRounds: number = await this.preparePlayers();

        // Choose starting player (randomly)
        const startingPlayer = random(this.players);
        this.broadcast(["startingPlayer", startingPlayer]);
        
        
        this.broadcastRanking(this.teams, false);

        // Choose Trumpf
        const trumpf: JassStichOrder = random(JassStichOrder.colors());
        this.broadcast(["trumpf", trumpf]);


        // Have all players guess scores
        await this.allPlayers(p => p.guessScore(0, 157));
        this.broadcastRanking(this.teams, true);

        // Wait for all players and animations
        await wait(1500);

        // Play the rounds
        let lastWinner: JassPlayer = startingPlayer;
        for (let i = 0; i < numberOfRounds; i++) {
            // Create the stich object
            const stich = new JassStich(trumpf);

            this.broadcast("startstich");

            for (let j = 0; j < this.players.length; j++) {
                const curPlayerIndex = (lastWinner.index + j) % this.players.length;

                // Broadcast the player info
                this.broadcast(["turnindicator", [curPlayerIndex, 'yellow']]);

                // Broadcast the stich
                this.broadcast(["stichinfo", stich]);
                
                // Select player
                const player: JassPlayer = this.players[curPlayerIndex];

                // Find playable cards
                const playable = player.hand.getPlayable(stich, true);

                // If the player plays faster than 500ms, give the animations some time to breathe
                await Promise.all([
                    wait(500),
                    (async () => {
                        // Ask the player which card to play
                        const played: JassCard = await player.chooseCard(playable);

                        // Remove the card from the hand and add it to the stich
                        player.hand.remove(played);
                        stich.add(player, played);

                        // Send a broadcast signal so that game state is updated on all clients
                        this.broadcast(["playcard", played]);
                    })()
                ]);
            }
            lastWinner = stich.getWinner();
            const scorePlus = stich.getScore();
            lastWinner.currentScore += scorePlus;
            this.broadcast(["stichwinner", lastWinner]);
            this.broadcastLastStich(stich);

            // make stich ranking
            
            this.broadcastRanking(this.teams, true);

            this.broadcast(["turnindicator", [lastWinner.index, 'green']]);

            // Wait for animations
            await wait(1500);
        }

        // Broadcast an empty stich
        this.broadcast(["stichinfo", new JassStich(trumpf)]);


        // Last stich gives bonus points
        lastWinner.currentScore += 5;
        
        // make final stich ranking
        for (const player of this.players) { 
            player.totalScore += Math.abs(player.currentScore - player.guessedScore);
        }
        this.broadcastRanking(this.teams, true);


        // reset all players current score
        for (const player of this.players) { 
            player.currentScore = 0;
            player.guessedScore = 0;
        }


        await wait(4000);

    }
}
