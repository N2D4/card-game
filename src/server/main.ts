import 'common/tweaks';

import express from 'express';
import {startBot} from 'src/tgbot/tgbot';
import pkg from 'package.json';
import socketio from 'socket.io';
import JassGame from 'src/common/game/jass/JassGame';
import DifferenzlerJassGame from 'src/common/game/jass/modes/DifferenzlerJassGame';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import NetworkJassPlayer from 'src/common/game/jass/players/NetworkJassPlayer';
import {wrapThrowing, shuffle, INCREMENTAL_VERSION, throwExp} from 'src/common/utils';
import ExampleJassPlayer from './ExampleJassPlayer';
import Matchmaker, {LobbyState, LobbyType, Lobby} from './Matchmaker';
import path from 'path';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';
import {assertNonNull} from 'src/common/utils';
import Serializer from 'src/common/serialize/Serializer';
import util from 'util';
import crypto from 'crypto';


type LobbyPlayer = {secretToken: string, name: string, _socket: socketio.Socket | null};
const allPlayersByToken = new Map<string, {inGame: false, player: LobbyPlayer} | {inGame: true, player: NetworkJassPlayer}>(); // TODO prevent memory leaks, eg. using expiry

function setSocketForToken(secretToken: string, socket: socketio.Socket): boolean {
    const player = allPlayersByToken.get(secretToken);
    if (player === undefined) return false;
    if (player.inGame) player.player.setSocket(socket);
    else setLobbyPlayerSocket(player.player, socket)?.disconnect();
    return true;
}

async function createLobbyPlayer(name: string, secretToken: string, socket: socketio.Socket): Promise<LobbyPlayer> {
    const lobbyPlayer = {
        secretToken: secretToken,
        name: name,
        _socket: null,
    } as LobbyPlayer;
    setLobbyPlayerSocket(lobbyPlayer, socket);
    allPlayersByToken.set(lobbyPlayer.secretToken, {inGame: false, player: lobbyPlayer});
    return lobbyPlayer;
}

function setLobbyPlayerSocket(player: LobbyPlayer, socket: socketio.Socket | null): socketio.Socket | null {
    const oldSocket = player._socket;
    player._socket = socket;
    player._socket?.emit('server.reconnect-token', player.secretToken);
    matchmaker.getLobbies(player).forEach(l => matchmaker.forceUpdateSoon(l));
    if (socket !== null) {
        socket.on('disconnect', () => {
            if (player._socket === socket) {
                console.log(`Socket ${socket.id} disconnected`);
                /*allPlayersByToken.delete(player.secretToken);
                matchmaker.unqueuePlayer(player);*/
            }
        });
    }
    return oldSocket;
}

const lobbyIdForPlayer = new WeakMap<JassPlayer, string>();
const playerNames = new WeakMap<LobbyPlayer, string>();

/**
 * Returns the player object and a function used to destroy it.
 */
function createJassPlayer(lobbyPlayer: LobbyPlayer, lobbyId: string): [JassPlayer, () => void] {
    const player = new NetworkJassPlayer(
        setLobbyPlayerSocket(lobbyPlayer, null) ?? throwExp(new Error(`Lobby player must have a socket!`)),
        lobbyPlayer.name,
        lobbyPlayer.secretToken
    );
    lobbyIdForPlayer.set(player, lobbyId);
    allPlayersByToken.set(lobbyPlayer.secretToken, {inGame: true, player});
    return [player, () => {
        player.getSocket().disconnect();
        allPlayersByToken.delete(player.secretToken);
    }];
}

function createLobbyType(id: string, maxPlayerCount: number, constructor: any) {
    return {
        id: id,
        maxPlayerCount: maxPlayerCount,
        startGame: (lobby: Lobby<LobbyPlayer, JassGame>, onClose: () => void, ...players: LobbyPlayer[]) => {
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
const schieber = createLobbyType('schieber', 4, SchieberJassGame);

const matchmaker = new Matchmaker<LobbyPlayer, JassGame>();
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
    afterUpdate?: (e: LobbyState<LobbyPlayer, JassGame>, m: Matchmaker<LobbyPlayer, JassGame>) => void,
    type: LobbyType<LobbyPlayer, JassGame> = differenzler,
    autoRefresh: boolean = false
): Lobby<LobbyPlayer, JassGame> | null {
    const mAfterUpdate = afterUpdate ?? (_ => {});

    if (matchmaker.getLobby(urlID) !== undefined) return null;

    const newAfterUpdate = (e: LobbyState<LobbyPlayer, JassGame>, m: Matchmaker<LobbyPlayer, JassGame>) => {
        mAfterUpdate(e, m);
        if (e !== null) {
            if (!e.inGame) {
                e.players.forEach(p => p._socket?.emit('lobby.waiting-players-update', e.players.length));
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
    console.log("Matchmaker info:", matchmaker.getInfo(s => s._socket?.id, g => g.constructor.name));
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
        let resolver: (s: string) => void;
        const secretTokenPromise = new Promise<string>(resolve => resolver = resolve);
        
        socket.on('lobby.get-lobby-ids', wrapThrowing(async (resp) => {
            if (typeof resp !== 'function') throw new Error(`resp not a callback!`);
            const player = allPlayersByToken.get(await secretTokenPromise);
            if (player === undefined || player.inGame) return false;
            resp([...matchmaker.getLobbies(player.player)].map(l => l.id));
        }));

        socket.on('server.check-version', wrapThrowing((version) => {
            if (version !== INCREMENTAL_VERSION) socket.emit('server.force-reload');
        }));

        socket.on('lobby.can-reconnect', wrapThrowing((token, lobbyId, resp) => {
            if (typeof token !== 'string') throw new Error(`Token is not a string!`);
            if (lobbyId !== null && typeof lobbyId !== 'string') throw new Error(`Lobby ID is not null or a string!`);
            if (typeof resp !== 'function') throw new Error(`Response callback is not a function!`);

            const player = allPlayersByToken.get(token);
            if (player === undefined) resp(false);
            else if (player.inGame) resp(lobbyId === undefined || lobbyIdForPlayer.get(player.player) === lobbyId);
            else {
                const lobby = matchmaker.getLobby(lobbyId);
                if (lobby === undefined) resp(false);
                else resp(matchmaker.isInLobby(player.player, lobby));
            }
        }));

        socket.once('lobby.reconnect',  wrapThrowing((token) => {
            const player = allPlayersByToken.get(token);
            if (player === null) {
                socket.emit('lobby.error', 'unknown-reconnect-token');
                socket.disconnect();
                return;
            }
            console.log(`Player reconnected! Welcome back`);
            resolver(token);
            setSocketForToken(token, socket);
        }));

        socket.once('lobby.join', wrapThrowing(async (data, name) => {
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
                resolver((await util.promisify(crypto.randomBytes)(32)).toString('base64'));
                const res = matchmaker.queuePlayer(await createLobbyPlayer(name, await secretTokenPromise, socket), [lobby]);
                if (res.length !== 1 || res[0] !== 'success') {
                    console.log(`Error joining lobby: ${JSON.stringify(res)}`);
                    socket.emit('lobby.error', 'cant-join-lobby', res[0]);
                    socket.disconnect();
                    return;
                }
            }
        }));
    
        socket.on('lobby.request-start-game', wrapThrowing(async (data) => {
            if (!data) data = 'default';
            if (typeof data !== 'string') throw new Error(`Not a string!`);

            console.log(`Socket trying to start lobby ${data}`);
            
            const lobby = matchmaker.getLobby(data);
            if (lobby === undefined) {
                console.log(`Lobby with id ${data} doesn't exist!`);
                socket.emit('lobby.error', 'unknown-lobby-id');
                return;
            }

            const state = matchmaker.getLobbyState(lobby);
            const player = allPlayersByToken.get(await secretTokenPromise);
            if (player === undefined || player.inGame || !matchmaker.isInLobby(player.player, lobby) || state === null || state.inGame) {
                console.log(`The player is not in this waiting lobby or it doesn't exist!`);
                socket.emit('lobby.error', 'not-in-waiting-lobby');
                return;
            }

            matchmaker.startGame(lobby);
        }));

        console.log();
        console.log("Socket connected", socket.id);
    });
}
