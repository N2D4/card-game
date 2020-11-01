import NetworkJassPlayer from "src/common/game/jass/players/NetworkJassPlayer";
import child_process from 'child_process';
import ISerializable from 'src/common/serialize/ISerializable';
import readline from 'readline';
import {wait, throwExp} from 'src/common/utils.js';

class ShellSocket {
    private readonly process: child_process.ChildProcess;
    private readonly stdout: readline.Interface;
    private readonly stderr: readline.Interface;
    private readonly handlers = new Map<string, ((...ISerializable: any[]) => void)[]>();

    constructor(cmd: string) {
        const waitPromise = wait(500);
        console.log(`Running command ${cmd}`);

        this.process = child_process.spawn('/bin/sh', ['-c', cmd], {stdio: 'pipe'});
        this.process.stdout!.setEncoding('utf8');
        this.process.on('exit', (exitCode) => {
            console.log(`Process ${cmd} exited with error code ${exitCode}`);
        });

        this.stdout = readline.createInterface({
            input: this.process.stdout ?? throwExp(new Error(`No stdout!`)),
        });
        this.stdout.on('line', (data) => {
            console.error("sh stdout>", data);
            const json = JSON.parse(data);
            if (!Array.isArray(json)) {
                console.error(`Message not a JSON array with length >= 1!`, json);
                throw new Error(`Message not a JSON array with length >= 1!`);
            }
            const args = json.slice(1);
            waitPromise.then(() => {
                (
                    this.handlers.get(json[0]) ??
                    (console.error(`No handlers registered for event ${json[0]}!`), [])
                ).forEach(a => a(...args))
            });
        });

        this.stderr = readline.createInterface({
            input: this.process.stderr ?? throwExp(new Error(`No stderr!`)),
        });
        this.stderr.on('line', (data) => {
            console.error("sh stderr>", data);
        });

    }

    public disconnect(): void {
        this.process.kill();
    }

    public emit(eventName: string, ...data: ISerializable[]): void {
        if (this.process.killed) {
            console.warn(`Tried emitting ${eventName} to dead process! Ignoring`);
            return;
        }
        this.process.stdin!.write(JSON.stringify([eventName, ...data]) + "\n", "utf-8");
    }

    public on(eventName: string, callback: (...data: ISerializable[]) => void): void {
        if (!this.handlers.has(eventName)) this.handlers.set(eventName, []);
        this.handlers.get(eventName)!.push(callback);
    }
}

export default class ShellJassPlayer extends NetworkJassPlayer {
    constructor(cmd: string, name: string) {
        super(new ShellSocket(cmd), name);
    }

    public setSocket(playerSocket: unknown): never {
        throw new Error(`Shell Jass player's socket can't be set!`);
    }
}