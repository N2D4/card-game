import { JassCard, JassColor, JassType} from 'common/game/jass/JassCard';
import JassGame from 'common/game/jass/JassGame';
import JassStich from 'common/game/jass/JassStich';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import { random, wait } from 'common/utils';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import { JassWyys, JassWyysType } from '../JassWyys';
import assert from 'assert';

export default class SchieberJassGame extends JassGame {
    public readonly teams: [[JassPlayer, JassPlayer], [JassPlayer, JassPlayer]];
    private roundCount = 0; // one-based

    constructor(player1: JassPlayer, player2: JassPlayer, player3: JassPlayer, player4: JassPlayer, private startingPlayer?: JassPlayer) {
        super([player1, player2, player3, player4]);
        this.teams = [[player1, player3], [player2, player4]];
    }

    public hasEnded() : boolean {
        const ranking = this.createRanking(this.teams);
        return ranking.some(r => r.totalScore >= 1000);
    }

    public async playRound(): Promise<void> {
        if (this.hasEnded()) throw new Error(`Game has ended!`);

        this.roundCount++;
        this.resetGameState();

        const numberOfRounds = await this.preparePlayers();

        // find player with roesle 7 if starting player is undefined
        if (this.startingPlayer === undefined)
            this.startingPlayer = this.players.filter(p => p.hand.contains(JassCard.getRoesle7()))[0];
        this.broadcast(["startingPlayer", this.startingPlayer]);
        
        this.broadcastRanking(this.teams, false);

        // Choose Trumpf
        const order: (JassStichOrder | "schieb")[] = [...JassStichOrder.getSchieberStichOrder()];
        order.push("schieb");
        this.broadcast(["turnindicator", [this.startingPlayer.index, 'yellow']]);
        let trumpf: (JassStichOrder | "schieb") = await this.startingPlayer.chooseStichOrder(order);
        this.broadcast(["trumpf", trumpf]);

        // if first player chose schieb, player 2 selects new trumpf
        if (trumpf === "schieb") {
            const nextPlayerIndex = (this.startingPlayer.index + 2) % this.players.length;
            this.broadcast(["turnindicator", [nextPlayerIndex, 'yellow']]);
            trumpf = await this.players[nextPlayerIndex].chooseStichOrder(JassStichOrder.getSchieberStichOrder());
            this.broadcast(["trumpf", trumpf]);
        }

        // Play the rounds
        let lastWinner: JassPlayer = this.startingPlayer;

        // stores options of each player
        const options: JassWyys[][] = [[], [], [], []]; 

        // stores best Wyys;
        let bestWyys: JassWyys = new JassWyys(JassCard.getCard(JassColor.ROESLE, JassType.SECHSER), JassWyysType.DREIBLATT);
        let wyysWinner: number = 4;

        // stores if player wants to wyys
        const willWyys: boolean[] = [false, false, false, false];

        // matching team
        let ableToMatch = [...this.teams];

        for (let i = 0; i < numberOfRounds; i++) {
            // Create and broadcast the Stich object
            const stich = new JassStich(trumpf);

            this.broadcast("startstich");

            for (let j = 0; j < this.players.length; j++) {
                const curPlayerIndex = (lastWinner.index + j) % this.players.length;

                // Broadcast the player info
                this.broadcast(["turnindicator", [curPlayerIndex, 'yellow']]);

                // Broadcast the stich
                this.broadcast(["stichinfo", stich]);

                // Wait for animations
                await wait(500);

                // Select player
                const player: JassPlayer = this.players[curPlayerIndex];

                // ask players if they want to wyys if its turn 1
                if (i === 0) {
                    // get all possible wyys options for player
                    options[j] = player.hand.getWyysOptions();
                    options[j].sort(JassWyys.compare);
                    
                    // ask him if he wants to wyys if he can
                    if (options[j].length !== 0 && JassWyys.compare(options[j][options[j].length - 1], bestWyys) >= 0) 
                        willWyys[j] = await player.chooseToWyys((options[j]));
                    
                    if (willWyys[j]) {
                        // player decided to wyys, broadcast wyys to everyone
                        bestWyys = options[j][options[j].length - 1];
                        wyysWinner = j % 2;
                        this.broadcast(["bestWyys", bestWyys]);
                    }
                }

                // Find playable cards
                const playable = player.hand.getPlayable(stich, false);

                // Ask the player which card to play
                const played: JassCard = await player.chooseCard(playable);
                
                // Remove the card from the hand and add it to the stich
                player.hand.remove(played);
                stich.add(player, played);

                // Send a broadcast signal so that game state is updated on all clients
                // We've already broadcasted the same stich object so don't need to do that again
                this.broadcast(["playcard", played]);
            }

            // add scores to team with better wyys after the end of the first turn
            if (i === 0) {
                for (let k = wyysWinner; k < 4; k += 2) {
                    this.players[k].currentScore += JassWyys.sum(options[k]);
                }
            }

            // get new winner
            lastWinner = stich.getWinner();
            const scorePlus = stich.getScore();
            lastWinner.currentScore += scorePlus;
            this.broadcast(["stichwinner", lastWinner]);
            this.broadcastLastStich(stich);


            // update teams that can still match
            ableToMatch = ableToMatch.filter(a => a.includes(lastWinner));
            
            // update stich ranking
            this.broadcastRanking(this.teams, false);

            this.broadcast(["turnindicator", [lastWinner.index, 'green']]);

            // Wait for animations
            await wait(1500);
        }


        // Last stich gives bonus points
        lastWinner.currentScore += 5;

        // Give bonus point to players with matches
        for (const team of ableToMatch) {
            let points = 100;
            for (let i = 0; i < team.length; i++) {
                const player = team[i];
                const playerPoints = Math.floor(points / team.length - i);
                player.totalScore += playerPoints;
                points -= playerPoints;
            }
            assert(points === 0);
        }

        // create round ranking
        const finalTrumpf = trumpf;
        for (const player of this.players) {
            player.totalScore += finalTrumpf.getScoreMultiplier() * player.currentScore;
        }
        this.broadcastRanking(this.teams, false);
        
        // reset curr Score
        for (const player of this.players) {
            player.currentScore = 0;
        }
        

        // Next player
        this.startingPlayer = this.players[(this.startingPlayer.index + 1) % this.players.length];

    }
}
