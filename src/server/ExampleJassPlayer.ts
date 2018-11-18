import {JassCard, JassColor, JassType} from 'common/game/jass/JassCard';
import JassPlayer from 'common/game/jass/JassPlayer';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import { random } from 'src/common/utils';

export default class ExampleJassPlayer extends JassPlayer {

    public constructor(public readonly name: string) {
        super();
    }

    public async chooseCard(choices: JassCard[]): Promise<JassCard> {
        console.log("==== " + this.name + " ====");
        console.log("Choosing card...");
        console.log(choices);
        const rnd = random(choices);
        console.log("Chose:");
        console.log(rnd);
        return rnd;
    }
    
    public async askForScore(rangeMin: number, rangeMax: number): Promise<number> {
        console.log("==== " + this.name + " ====");
        console.log("Guessing score...");
        const rnd = Math.floor(Math.random() * (rangeMax - rangeMin + 1) + rangeMin);
        console.log("Chose:");
        console.log(rnd);
        return rnd;
    }

    public async chooseStichOrder(choices: JassStichOrder[]): Promise<JassStichOrder> {
        console.log("==== " + this.name + " ====");
        throw new Error("Method not implemented.");
    }

    public async sendGameState(state: any): Promise<void> {
        console.log("==== " + this.name + " ====");
        console.log("Received message");
        console.log(state);
    }
    
}
