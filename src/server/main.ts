import 'common/tweaks';

import express from 'express';
import {startBot} from 'src/tgbot/tgbot';
import pkg from 'package.json';
import socketio from 'socket.io';
import JassGame from 'src/common/game/jass/JassGame';
import DifferenzlerJassGame from 'src/common/game/jass/modes/DifferenzlerJassGame';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import NetworkJassPlayer from 'src/common/game/jass/players/NetworkJassPlayer';
import {pseudoUUID} from 'src/common/utils';
import ExampleJassPlayer from './ExampleJassPlayer';
import Matchmaker from './Matchmaker';
import path from 'path';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';

function createLobbyType(id: string, playerCount: number, constructor: unknown) {
    return {
        id: id,
        playerCount: playerCount,
        startGame: (onClose: () => void, ...players: socketio.Socket[]) => {
            console.log("Starting game with players", ...players.map(s => s.id));
            const arr: JassPlayer[] = players.map(s => new NetworkJassPlayer(s));
            while (arr.length < 4) {
                arr.push(new ExampleJassPlayer(pseudoUUID()));
            }
            // @ts-ignore
            const game = new constructor(arr[0], arr[1], arr[2], arr[3]);
            game.playRound().then(onClose);
            return game;
        }
    };
}

const soloDifferenzler = createLobbyType('solo-differenzler', 1, DifferenzlerJassGame);
const duoDifferenzler = createLobbyType('duo-differenzler', 2, DifferenzlerJassGame);
const soloSchieber = createLobbyType('solo-schieber', 1, SchieberJassGame);
const duoSchieber = createLobbyType('duo-schieber', 2, SchieberJassGame);

const defaultLobby = {
    id: 'default',
    type: soloDifferenzler,
    autoRefresh: true
};


const matchmaker = new Matchmaker(defaultLobby);



try {
    startServer();
} catch (e) {
    console.error("Error starting server!!", e);
}

try {
    if (!['TRUE', 'FALSE', undefined].includes(process.env.ENABLE_TG_BOT)) throw new Error(`Unknown value for env variable ENABLE_TG_BOT! ${process.env.ENABLE_TG_BOT}`);
    if (process.env.ENABLE_TG_BOT === 'TRUE') startBot(createLobby);
    else console.log(`$ENABLE_TG_BOT not set to TRUE, not running the Telegram bot`);
} catch (e) {
    console.error("Error starting Telegram bot!!", e);
}

setInterval(() => console.log(`15 minutes have passed`), 15*60*1000);

function createLobby(urlID: string, onUpdate: (e: {inGame: false, players: socketio.Socket[]} | {inGame: true, game: JassGame} | null) => void): boolean {
    if (matchmaker.getLobby(urlID) !== undefined) return false;

    const lobby = {
        id: urlID,
        type: duoDifferenzler,
        onUpdate: onUpdate,
        expire: Date.now() + 36*60*60*1000,
        autoRefresh: false
    };

    console.log(`Created lobby ${urlID}`);
    console.log("Matchmaker info:", matchmaker.getInfo(s => s.id, g => g.constructor.name));
    matchmaker.addLobby(lobby);
    return true;
}

function startServer() {
    const app: express.Application = express();
    const port: number = +(process.env.PORT || 3000);
    
    const clientFiles: Map<string, string> = new Map(Object.entries(pkg.client_files));
    app.use((req, res, next) => {
        const value = clientFiles.get(req.path);
        if (value !== undefined) {
            res.sendFile(path.resolve(process.cwd(), value));
        } else {
            next();
        }
    });
    for (const [key, value] of Object.entries(clientFiles)) {
        app.use(key, (req, res, next) => res.sendFile(path.resolve(process.cwd(), value)));
    }
    
    const server = app.listen(port, () => {
        // tslint:disable-next-line:no-console
        console.log(`Listening at http://localhost:${port}/`);
    });
    
    const io: socketio.Server = socketio(server);
    
    io.on('connection', (socket) => {
        socket.once('join', (data) => {
            if (!data) data = 'default';
            if (typeof data !== 'string') throw new Error(`Not a string!`);

            console.log();
            console.log("Socket trying to join lobby " + data, socket.id);

            const lobby = matchmaker.getLobby(data);
            if (lobby === undefined) {
                console.log("Lobby doesn't exist!");
                socket.emit('unknown-lobby');
                socket.disconnect();
                return;
            }

            const res = matchmaker.queuePlayer(socket, [lobby]);
            if (res.length !== 1 || res[0] !== true) {
                console.log(`Error joining lobby! Is it full, has the game started or already ended? ${JSON.stringify(res)}`);
            }
            console.log("Matchmaker info:", matchmaker.getInfo(s => s.id, g => g.constructor.name));
        });
        console.log();
        console.log("Socket connected", socket.id);
    });    
}
