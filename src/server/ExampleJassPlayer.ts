import {JassCard, JassColor, JassType} from 'common/game/jass/JassCard';
import JassPlayer from 'common/game/jass/JassPlayer';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import {JassWyys, JassWyysType} from 'src/common/game/jass/JassWyys';
import { random } from 'src/common/utils';
import util from 'util';

export default class ExampleJassPlayer extends JassPlayer {

    public constructor(public readonly name: string) {
        super();
    }

    public async chooseCard(choices: JassCard[]): Promise<JassCard> {
        console.log();
        console.log("==== " + this.name + " ====");
        console.log("Choosing card...");
        console.log(choices);
        const rnd = random(choices);
        console.log("Chose:");
        console.log(rnd);
        return rnd;
    }

    public async chooseToWyys(options: JassWyys[]): Promise<boolean> {
        return true;
    }
    
    public async askForScore(rangeMin: number, rangeMax: number): Promise<number> {
        console.log();
        console.log("==== " + this.name + " ====");
        console.log("Guessing score...");
        const rnd = Math.floor(Math.random() * (rangeMax - rangeMin + 1) + rangeMin);
        console.log("Chose:");
        console.log(rnd);
        return rnd;
    }

    public async chooseStichOrder<G, T extends (JassStichOrder | G)>(choices: T[]): Promise<T> {
        console.log();
        console.log("==== " + this.name + " ====");
        console.log("Choosing stich order...");
        console.log(choices);
        const rnd = random(choices);
        console.log("Chose:");
        console.log(rnd);
        return rnd;
    }

    public async sendGameState(state: any): Promise<void> {
        console.log();
        console.log("==== " + this.name + " ====");
        console.log("Received message");
        console.log(util.inspect(state, {showHidden: true, depth: 6}));
    }
    
}
