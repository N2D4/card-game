// tslint:disable:no-console

import { JassCard } from 'common/game/jass/JassCard';
import JassStichOrder from 'common/game/jass/JassStichOrder';
import {JassWyys, JassWyysType} from 'src/common/game/jass/JassWyys';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import { random } from 'src/common/utils';
import util from 'util';

const log = /*console.log*/ (a?: any) => {};

export default class ExampleJassPlayer extends JassPlayer {

    public constructor(public readonly name: string) {
        super();
    }

    public async chooseCard(choices: JassCard[]): Promise<JassCard> {
        log();
        log("==== " + this.name + " ====");
        log("Choosing card...");
        log(choices);
        const rnd = random(choices);
        log("Chose:");
        log(rnd);
        return rnd;
    }

    public async chooseToWyys(options: JassWyys[]): Promise<boolean> {
        return true;
    }
    
    public async askForScore(rangeMin: number, rangeMax: number): Promise<number> {
        log();
        log("==== " + this.name + " ====");
        log("Guessing score...");
        const rnd = Math.floor(Math.random() * (rangeMax - rangeMin + 1) + rangeMin);
        log("Chose:");
        log(rnd);
        return rnd;
    }

    public async chooseStichOrder<G, T extends (JassStichOrder | G)>(choices: T[]): Promise<T> {
        log();
        log("==== " + this.name + " ====");
        log("Choosing stich order...");
        log(choices);
        const rnd = random(choices);
        log("Chose:");
        log(rnd);
        return rnd;
    }

    public async sendGameState(state: any): Promise<void> {
        log();
        log("==== " + this.name + " ====");
        log("Received message");
        log(util.inspect(state, {showHidden: true, depth: 6}));
    }
    
}
