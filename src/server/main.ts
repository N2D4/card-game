import 'common/tweaks';

import express from 'express';
import {startBot} from 'src/tgbot/tgbot';
import pkg from 'package.json';
import socketio from 'socket.io';
import DifferenzlerJassGame from 'src/common/game/jass/modes/DifferenzlerJassGame';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import NetworkJassPlayer from 'src/common/game/jass/players/NetworkJassPlayer';
import { pseudoUUID } from 'src/common/utils';
import ExampleJassPlayer from './ExampleJassPlayer';
import Matchmaker, {Lobby} from './Matchmaker';
import path from 'path';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';

function createLobbyType(id: string, playerCount: number, constructor: unknown) {
    return {
        id: id,
        playerCount: playerCount,
        startGame: (...players: socketio.Socket[]) => {
            console.log("Starting game with players", ...players.map(s => s.id));
            const arr: JassPlayer[] = players.map(s => new NetworkJassPlayer(s));
            while (arr.length < 4) {
                arr.push(new ExampleJassPlayer(pseudoUUID()));
            }
            // @ts-ignore
            const game = new constructor(arr[0], arr[1], arr[2], arr[3]);
            game.play();
        }
    };
}

const soloDifferenzler = createLobbyType('solo-differenzler', 1, DifferenzlerJassGame);
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
    startBot(createLobby);
} catch (e) {
    console.error("Error starting Telegram bot!!", e);
}

const lobbyURLs = new Map<string, Lobby<socketio.Socket>>();        // TODO move to matchmaker (so expiry removes objects from here)

function createLobby(urlID: string) {
    if (lobbyURLs.has(urlID)) throw new Error(`There's already a lobby with this URL!`);

    const lobby = {
        id: urlID,
        type: duoSchieber,
        expire: Date.now() + 36*60*60*1000,
        autoRefresh: false
    };
    matchmaker.addLobby(lobby);
    lobbyURLs.set(urlID, lobby);
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
        const res = matchmaker.queuePlayer(socket, [defaultLobby]);
        if (res.length !== 1 || res[0] !== true) throw new Error("Assertion error " + res);
        console.log();
        console.log("Socket connected", socket.id);
        console.log("Matchmaker info:", matchmaker.getInfo(s => s.id));
    });    
}
