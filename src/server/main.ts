import 'common/tweaks';

import express from 'express';
import {startBot} from 'src/tgbot/tgbot';
import pkg from 'package.json';
import socketio from 'socket.io';
import JassGame from 'src/common/game/jass/JassGame';
import DifferenzlerJassGame from 'src/common/game/jass/modes/DifferenzlerJassGame';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import NetworkJassPlayer from 'src/common/game/jass/players/NetworkJassPlayer';
import {wrapThrowing, shuffle, INCREMENTAL_VERSION} from 'src/common/utils';
import ExampleJassPlayer from './ExampleJassPlayer';
import Matchmaker, {LobbyState, LobbyType, Lobby} from './Matchmaker';
import path from 'path';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';
import {assertNonNull} from 'src/common/utils';
import Serializer from 'src/common/serialize/Serializer';


const lobbyIdForPlayer = new WeakMap<JassPlayer, string>();
const playerNames = new WeakMap<socketio.Socket, string>();

/**
 * Returns the player object and a function used to destroy it.
 */
function createJassPlayer(socket: socketio.Socket, lobbyId: string): [JassPlayer, () => void] {
    const player = new NetworkJassPlayer(socket, playerNames.get(socket) ?? 'player name');
    lobbyIdForPlayer.set(player, lobbyId);
    return [player, () => void player.destroy()];
}

function createLobbyType(id: string, maxPlayerCount: number, constructor: any) {
    return {
        id: id,
        maxPlayerCount: maxPlayerCount,
        startGame: (lobby: Lobby<socketio.Socket, JassGame>, onClose: () => void, ...players: socketio.Socket[]) => {
            console.log("Starting game with players", ...players.map(s => s.id));
            const arr = players.map(s => createJassPlayer(s, lobby.id));
            shuffle(arr);
            const botNames = ["Alexa Bot", "Cortana Bot", "Siri Bot", "Boomer Bot"];
            while (arr.length < 4) {
                arr.push([new ExampleJassPlayer(botNames.shift() ?? "Unnamed Bot"), () => 0]);
            }
            const game = new constructor(arr[0][0], arr[1][0], arr[2][0], arr[3][0]);
            game.playRound().then(() => {
                onClose();
                for (const p of arr) {
                    p[1]();
                }
            });
            return game;
        }
    };
}

const soloDifferenzler = createLobbyType('solo-differenzler', 1, DifferenzlerJassGame);
const duoDifferenzler = createLobbyType('duo-differenzler', 2, DifferenzlerJassGame);
const differenzler = createLobbyType('duo-differenzler', 4, DifferenzlerJassGame);
const soloSchieber = createLobbyType('solo-schieber', 1, SchieberJassGame);
const duoSchieber = createLobbyType('duo-schieber', 2, SchieberJassGame);
const schieber = createLobbyType('duo-schieber', 4, SchieberJassGame);

const matchmaker = new Matchmaker<socketio.Socket, JassGame>();
const defaultLobby = assertNonNull(createLobby('default', (state, mm) => {
    if (state === null) return;
    if (state.inGame) return;
    if (state.players.length < state.lobby.type.maxPlayerCount) return;
    mm.startGame(state.lobby);
}, soloDifferenzler, true));



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

function createLobby(
    urlID: string,
    afterUpdate?: (e: LobbyState<socketio.Socket, JassGame>, m: Matchmaker<socketio.Socket, JassGame>) => void,
    type: LobbyType<socketio.Socket, JassGame> = schieber,
    autoRefresh: boolean = false
): Lobby<socketio.Socket, JassGame> | null {
    const mAfterUpdate = afterUpdate ?? (_ => {});

    if (matchmaker.getLobby(urlID) !== undefined) return null;

    const newAfterUpdate = (e: LobbyState<socketio.Socket, JassGame>, m: Matchmaker<socketio.Socket, JassGame>) => {
        mAfterUpdate(e, m);
        if (e !== null) {
            if (!e.inGame) {
                e.players.forEach(p => p.emit('lobby.waiting-players-update', e.players.length));
            }
        }
    }

    const lobby = {
        id: urlID,
        type: type,
        afterUpdate: newAfterUpdate,
        expire: Date.now() + 36*60*60*1000,
        autoRefresh: autoRefresh
    };

    console.log(`Created lobby ${urlID}`);
    console.log("Matchmaker info:", matchmaker.getInfo(s => s.id, g => g.constructor.name));
    matchmaker.addLobby(lobby);
    return lobby;
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
        socket.on('server.check-version', wrapThrowing((version) => {
            if (version !== INCREMENTAL_VERSION) socket.emit('server.force-reload');
        }));

        socket.on('lobby.can-reconnect', wrapThrowing((token, lobbyId, resp) => {
            if (typeof token !== 'string') throw new Error(`Token is not a string!`);
            if (lobbyId !== null && typeof lobbyId !== 'string') throw new Error(`Lobby ID is not null or a string!`);
            if (typeof resp !== 'function') throw new Error(`Response callback is not a function!`);

            const player = NetworkJassPlayer.fromToken(token);
            resp(player !== null && (lobbyId === undefined || lobbyIdForPlayer.get(player) === lobbyId));
        }));

        socket.once('lobby.reconnect',  wrapThrowing((token) => {
            const player = NetworkJassPlayer.fromToken(token);
            if (player === null) {
                socket.emit('lobby.error', 'unknown-reconnect-token');
                socket.disconnect();
                return;
            }
            player.setSocket(socket);
        }));

        socket.once('lobby.join', wrapThrowing((data, name) => {
            if (!data) data = 'default';
            if (typeof data !== 'string') throw new Error(`Lobby id a string!`);
            if (typeof name !== 'string') {
                socket.emit('server.force-reload');
                throw new Error(`Name not a string!`);
            }

            console.log();
            console.log("Socket trying to join lobby " + data, socket.id);

            const lobby = matchmaker.getLobby(data);
            if (lobby === undefined) {
                console.log(`Lobby with id ${data} doesn't exist!`);
                socket.emit('lobby.error', 'unknown-lobby-id');
                socket.disconnect();
                return;
            }

            const lobbyState = matchmaker.getLobbyState(lobby);
            if (lobbyState?.inGame) {
                lobbyState.game.onUpdate((state) => socket.emit('gameinfo', Serializer.serialize({
                    isSpectating: true,
                    gameState: state,
                })));
            } else {
                const res = matchmaker.queuePlayer(socket, [lobby]);
                if (res.length !== 1 || res[0] !== 'success') {
                    console.log(`Error joining lobby: ${JSON.stringify(res)}`);
                    socket.emit('lobby.error', 'cant-join-lobby', res[0]);
                    socket.disconnect();
                    return;
                }
                playerNames.set(socket, name);
            }

            console.log("Player joined successfully!", matchmaker.getInfo(s => s.id, g => g.constructor.name));
        }));
    
        socket.on('lobby.request-start-game', wrapThrowing((data) => {
            if (!data) data = 'default';
            if (typeof data !== 'string') throw new Error(`Not a string!`);
            
            const lobby = matchmaker.getLobby(data);
            if (lobby === undefined) {
                console.log(`Lobby with id ${data} doesn't exist!`);
                socket.emit('lobby.error', 'unknown-lobby-id');
                return;
            }

            const state = matchmaker.getLobbyState(lobby);
            if (state === null || state.inGame || !state.players.includes(socket)) {
                socket.emit('lobby.error', 'not-in-waiting-lobby');
                return;
            }

            console.log(`Socket trying to start lobby ${data}`);
            matchmaker.startGame(lobby);
        }));

        socket.on('disconnect', wrapThrowing(() => {
            matchmaker.unqueuePlayer(socket);
        }));

        console.log();
        console.log("Socket connected", socket.id);
    });
}
