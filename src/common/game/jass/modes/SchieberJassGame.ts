import { JassCard, JassColor, JassType} from 'common/game/jass/JassCard';
import JassGame from 'common/game/jass/JassGame';
import JassStich from 'common/game/jass/JassStich';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import { JassWyys, JassWyysType } from '../JassWyys';

export default class SchieberJassGame extends JassGame {

    constructor(player1: JassPlayer, player2: JassPlayer, player3: JassPlayer, player4: JassPlayer, private startingPlayer?: JassPlayer) {
        super([player1, player2, player3, player4]);
    }

    // TODO: Untertrumpfen
    public async play(): Promise<void> {
        const numberOfRounds = await this.preparePlayers();

        // find player with roesle 7 if starting player is undefined
        if (this.startingPlayer === undefined)
            this.startingPlayer = this.players.filter(p => p.hand.contains(JassCard.getRoesle7()))[0];
        this.broadcastB(this.startingPlayer);
        
        // Choose Trumpf
        const order: Array<JassStichOrder | "schieb"> = [...JassStichOrder.getSchieberStichOrder()];
        order.push("schieb");
        let trumpf: (JassStichOrder | "schieb") = await this.startingPlayer.chooseStichOrder(order);
        this.broadcastB(trumpf);

        // if first player chose schieb, player 2 selects new trumpf
        if (trumpf === "schieb") {
            trumpf = await this.players[(this.startingPlayer.index + 2) % this.players.length].chooseStichOrder(JassStichOrder.getSchieberStichOrder());
            this.broadcastB(trumpf);
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

        for (let i = 0; i < numberOfRounds; i++) {
            // Create and broadcast the Stich object
            const stich = new JassStich(trumpf);
            this.broadcastB(stich);

            for (let j = 0; j < this.players.length; j++) {

                // Select player
                const player: JassPlayer = this.players[(lastWinner.index + j) % this.players.length];

                // ask players if they want to wyys if its turn 1
                if (i === 0) {
                    // get all possible wyys options for player
                    options[j] = player.hand.getWyysOptions();
                    options[j].sort(JassWyys.compare);
                    
                    // ask him if he wants to wyys if he can
                    if (options[j].length !== 0 && JassWyys.compare(options[j][options[j].length - 1], bestWyys) >= 0) 
                        willWyys[j] = await player.chooseToWyys(options[j]);
                    
                    if (willWyys[j]) {
                        // player decided to wyys, broadcast wyys to everyone
                        bestWyys = options[j][options[j].length - 1];
                        wyysWinner = j % 2;
                        this.broadcastB(bestWyys);
                    }
                }

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

            // add scores to team with better wyys
            for (let k = wyysWinner; k < 4; k += 2) {
                this.players[k].currentScore += JassWyys.sum(options[k]);
            }

            // get new winner
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
        this.broadcastB(ranking);
        this.broadcastB(trumpf.getScoreMultiplier());


        // Next player
        this.startingPlayer = this.players[(this.startingPlayer.index + 1) % this.players.length];

    }
}
