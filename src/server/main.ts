import 'common/tweaks';

import express from 'express';
import pkg from 'package.json';
import DifferenzlerJassGame from 'src/common/game/jass/modes/DifferenzlerJassGame';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';
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

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}/`);
});





const player1: ExampleJassPlayer = new ExampleJassPlayer("a");
const player2: ExampleJassPlayer = new ExampleJassPlayer("b");
const player3: ExampleJassPlayer = new ExampleJassPlayer("c");
const player4: ExampleJassPlayer = new ExampleJassPlayer("d");

const game: SchieberJassGame = new SchieberJassGame(player1, player2, player3, player4);

game.play();
