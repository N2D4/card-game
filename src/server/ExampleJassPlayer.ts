// tslint:disable:no-console

import { JassCard } from 'common/game/jass/JassCard';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import { JassWyys } from 'common/game/jass/JassWyys';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import { random } from 'src/common/utils';
import util from 'util';

export default class ExampleJassPlayer extends JassPlayer {

    public constructor(public readonly name: string) {
        super();
    }

    public chooseToWyys(wyys: JassWyys): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    public chooseWhatToWyys(wyys: JassWyys[]): Promise<JassWyys[]> {
        throw new Error("Method not implemented.");
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
