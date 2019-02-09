import 'common/tweaks';

import express from 'express';
import pkg from 'package.json';
import socketio from 'socket.io';
import JassGame from 'src/common/game/jass/JassGame';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import NetworkJassPlayer from 'src/common/game/jass/players/NetworkJassPlayer';
import { pseudoUUID } from 'src/common/utils';
import ExampleJassPlayer from './ExampleJassPlayer';

const app: express.Application = express();
const port: number = +(process.env.PORT || 3000);


app.get('/', (req, res) => {
    res.redirect('/index.html');
});

const client_files: {[key: string]: string} = pkg.client_files;
for (const [key, value] of Object.entries(client_files)) {
    app.use('/' + key, express.static(value));
}

const server = app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`Listening at http://localhost:${port}/`);
});



const io: socketio.Server = socketio(server);

const socketQueue: socketio.Socket[] = [];
const playerCount = 1;

io.on('connection', (socket) => {
    socketQueue.push(socket);
    while (socketQueue.length >= playerCount) {
        const arr: JassPlayer[] = socketQueue.splice(0, playerCount).map(s => new NetworkJassPlayer(s));
        while (arr.length < 4) {
            arr.push(new ExampleJassPlayer(pseudoUUID()));
        }

        const game: JassGame = new SchieberJassGame(arr[0], arr[1], arr[2], arr[3]);
        game.play();
    }
});
