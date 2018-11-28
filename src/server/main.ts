import 'common/tweaks';

import express from 'express';
import pkg from 'package.json';
import socketio, { Socket } from 'socket.io';
import DifferenzlerJassGame from 'src/common/game/jass/modes/DifferenzlerJassGame';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import NetworkJassPlayer from 'src/common/game/jass/players/NetworkJassPlayer';
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

io.on('connection', (socket) => {
    const player1: JassPlayer = new NetworkJassPlayer(socket);
    const player2: JassPlayer = new ExampleJassPlayer("b");
    const player3: JassPlayer = new ExampleJassPlayer("c");
    const player4: JassPlayer = new ExampleJassPlayer("d");

    const game: DifferenzlerJassGame = new DifferenzlerJassGame(player1, player2, player3, player4);
    game.play();
});
