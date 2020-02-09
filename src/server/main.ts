import 'common/tweaks';

import express from 'express';
import pkg from 'package.json';
import socketio from 'socket.io';
import JassGame from 'src/common/game/jass/JassGame';
import DifferenzlerJassGame from 'src/common/game/jass/modes/DifferenzlerJassGame';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import NetworkJassPlayer from 'src/common/game/jass/players/NetworkJassPlayer';
import { pseudoUUID } from 'src/common/utils';
import ExampleJassPlayer from './ExampleJassPlayer';
import Matchmaker from './Matchmaker';
import path from 'path';

const app: express.Application = express();
const port: number = +(process.env.PORT || 3000);


const client_files: Map<string, string> = new Map(Object.entries(pkg.client_files));
app.use((req, res, next) => {
    const value = client_files.get(req.path);
    if (value !== undefined) {
        res.sendFile(path.resolve(process.cwd(), value));
    } else {
        next();
    }
});
for (const [key, value] of Object.entries(client_files)) {
    app.use(key, (req, res, next) => res.sendFile(path.resolve(process.cwd(), value)));
}

const server = app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`Listening at http://localhost:${port}/`);
});

const io: socketio.Server = socketio(server);



const soloDifferenzler = {
    id: 'differenzler',
    playerCount: 1,
    startGame: (...players: socketio.Socket[]) => {
        console.log("Starting game with players", ...players.map(s => s.id));
        const arr: JassPlayer[] = players.map(s => new NetworkJassPlayer(s));
        while (arr.length < 4) {
            arr.push(new ExampleJassPlayer(pseudoUUID()));
        }
        const game = new DifferenzlerJassGame(arr[0], arr[1], arr[2], arr[3]);
        game.play();
    }
};

const defaultLobby = {
    id: 'default',
    type: soloDifferenzler,
    autoRefresh: true
};

const matchmaker = new Matchmaker(defaultLobby);

io.on('connection', (socket) => {
    const res = matchmaker.queuePlayer(socket, [defaultLobby]);
    if (res.length !== 1 || res[0] !== true) throw new Error("Assertion error " + res);
    console.log();
    console.log("Socket connected", socket.id);
    console.log("Matchmaker info:", matchmaker.getInfo(s => s.id));
});
