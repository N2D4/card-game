import './server-tweaks';

import express from 'express';
import {startBot} from 'src/tgbot/tgbot';
import pkg from 'package.json';
import socketio from 'socket.io';
import JassGame from 'src/common/game/jass/JassGame';
import DifferenzlerJassGame from 'src/common/game/jass/modes/DifferenzlerJassGame';
import JassPlayer from 'src/common/game/jass/players/JassPlayer';
import NetworkJassPlayer from 'src/common/game/jass/players/NetworkJassPlayer';
import { wrapThrowing, INCREMENTAL_VERSION, throwExp, wait, assertNonNull } from 'src/common/utils';
import ExampleJassPlayer from './bots/RandomJassPlayer';
import ShellJassPlayer from './bots/ShellJassPlayer';
import Matchmaker, {LobbyState, LobbyType, Lobby, MatchmakerTypeArgs, LobbyTypeArgs} from './Matchmaker';
import path from 'path';
import SchieberJassGame from 'src/common/game/jass/modes/SchieberJassGame';
import Serializer from 'src/common/serialize/Serializer';
import util from 'util';
import crypto from 'crypto';
import http from 'http';

function createBotPlayer(name: string) {
    return process.argv.length <= 2 ? new ExampleJassPlayer(name)
                                    : new ShellJassPlayer(process.argv[2], name);
}

type GameTypeInfo = {
    minPlayers: number, // will be filled up with bots
    maxPlayers: number, // everyone else will be spectating
    constructor: new (...players: JassPlayer[]) => JassGame,
};

type MatchmakerTA = MatchmakerTypeArgs<LobbyPlayer, JassGame>;
type DefaultLobbyTA = LobbyTypeArgs<MatchmakerTA, object, object>;
type PolymorphicLobbyTA = LobbyTypeArgs<MatchmakerTA, {gameType: GameTypeInfo}>;

type LobbyPlayer = {secretToken: string, name: string, _socket: socketio.Socket | null};
const allPlayersByToken = new Map<string, {inGame: false, player: LobbyPlayer} | {inGame: true, player: NetworkJassPlayer}>(); // TODO prevent memory leaks, eg. using expiration


function addSpectator(game: JassGame, socket: socketio.Socket) {
    game.onUpdate((state) => socket.emit('gameinfo', Serializer.serialize({
        isSpectating: true,
        gameState: state,
    })));
}

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

function setLobbyPlayerSocket(player: LobbyPlayer, socket: socketio.Socket | null): socketio.Socket | null {
    const oldSocket = player._socket;
    player._socket = socket;
    player._socket?.emit('server.reconnect-token', player.secretToken);
    matchmaker.getLobbies(player).forEach((l) => matchmaker.forceUpdateSoon(l));
    if (socket !== null) {
        socket.on('disconnect', () => {
            if (player._socket === socket) {
                console.log(`Socket ${socket.id} disconnected`);
                allPlayersByToken.delete(player.secretToken);
                matchmaker.unqueuePlayer(player);
            }
        });
    }
    return oldSocket;
}

const lobbyIdForPlayer = new WeakMap<JassPlayer, string>();

/**
 * Returns the player object and a function used to destroy it.
 */
function createJassPlayer(lobbyPlayer: LobbyPlayer, lobbyId: string): [JassPlayer, () => void] {
    const secretToken = lobbyPlayer.secretToken;
    const player = new NetworkJassPlayer(
        setLobbyPlayerSocket(lobbyPlayer, null) ?? throwExp(new Error(`Lobby player must have a socket!`)),
        lobbyPlayer.name,
    );
    lobbyIdForPlayer.set(player, lobbyId);
    allPlayersByToken.set(secretToken, {inGame: true, player});
    return [player, () => {
        (async () => {
            // keep the socket connected for some more time
            await wait(30000);
            player.getSocket().disconnect();
        })();
        lobbyIdForPlayer.delete(player);
        allPlayersByToken.delete(secretToken);
    }];
}

const schieberGameType = {
    id: 'schieber',
    minPlayers: 4,
    maxPlayers: 4,
    constructor: SchieberJassGame,
};
const differenzlerGameType = {
    id: 'differenzler',
    minPlayers: 4,
    maxPlayers: 4,
    constructor: DifferenzlerJassGame,
};

const gameTypes = new Map([
    schieberGameType,
    differenzlerGameType
].map(a => [a.id, a]));

function startGameOfType(
    type: GameTypeInfo,
    lobby: Lobby<any>,
    players: LobbyPlayer[],
    onClose: () => void
): JassGame {
    let close = onClose;
    try {
        const arr: JassPlayer[] = [];

        // Add actual players first
        let pi = 0;
        for (; arr.length < type.maxPlayers && pi < players.length; pi++) {
            const created = createJassPlayer(players[pi], lobby.id);
            arr.push(created[0]);
            close = ((old) => () => (created[1](), old()))(close);
        }
        // Fill with bots
        const botNames = ["Alexa Bot", "Cortana Bot", "Siri Bot", "Boomer Bot"];
        while (arr.length < type.minPlayers) {
            arr.push(createBotPlayer(botNames.shift() ?? "Unnamed Bot"));
        }

        // Create game
        const game = new type.constructor(...arr);

        // All remaining players are spectators
        for (; pi < players.length; pi++) {
            const socket = players[pi]._socket;
            if (socket !== null) addSpectator(game, socket);
        }

        // Play a bunch of rounds (asynchronously)
        (async () => {
            try {
                while (!game.hasEnded()) {
                    await game.playRound()
                }
            } finally {
                close();
            }
        })();

        // Return game object
        return game;
    } catch (e) {
        close();
        console.error(e);
        throw new Error(`Error creating Jass game! ${e}`);
    }
}

const matchmaker = new Matchmaker<MatchmakerTA>();

const polymorphicLobbyType: LobbyType<PolymorphicLobbyTA> = {
    id: 'polymorphic',
    maxPlayerCount: 2048,
    startGame: (lobby, lobbyData, onClose, players) => {
        return startGameOfType(lobbyData.gameType, lobby, [...players.keys()], onClose);
    },
    defaultLobbyData: () => ({
        gameType: differenzlerGameType,
    }),
    defaultPlayerData: () => ({}),
};

const defaultLobbyType: LobbyType<DefaultLobbyTA> = {
    id: 'default',
    maxPlayerCount: 1,
    startGame: (lobby, lobbyData, onClose, players) => {
        return startGameOfType(schieberGameType, lobby, [...players.keys()], onClose);
    },
    defaultLobbyData: () => ({}),
    defaultPlayerData: () => ({}),
};

const defaultLobby = assertNonNull(createLobby('default', defaultLobbyType, (state, mm) => {
    if (state === null) return;
    if (state.inGame) return;
    if (state.players.length < state.lobby.type.maxPlayerCount) return;
    mm.startGame(state.lobby);
}, true));



try {
    startServer();
} catch (e) {
    console.error("Error starting server!!", e);
}

try {
    if (!['TRUE', 'FALSE', undefined].includes(process.env.ENABLE_TG_BOT)) throw new Error(`Unknown value for env variable ENABLE_TG_BOT! ${process.env.ENABLE_TG_BOT}`);
    if (process.env.ENABLE_TG_BOT === 'TRUE') startBot((s, onUpdate) => createLobby(s, polymorphicLobbyType, onUpdate));
    else console.log(`$ENABLE_TG_BOT not set to TRUE, not running the Telegram bot`);
} catch (e) {
    console.error("Error starting Telegram bot!!", e);
}

function createLobby<LData, PData, T extends LobbyTypeArgs<MatchmakerTA, LData, PData>>(
    urlID: string,
    type: LobbyType<T>,
    afterUpdate?: (e: LobbyState<T>, m: Matchmaker<MatchmakerTA>) => void,
    autoRefresh = false
): Lobby<T> | null {
    const mAfterUpdate = afterUpdate ?? (() => 0);

    if (matchmaker.getLobby(urlID) !== undefined) return null;

    const newAfterUpdate = (state: LobbyState<T>, m: Matchmaker<MatchmakerTA>) => {
        mAfterUpdate(state, m);
        if (state !== null) {
            if (!state.inGame) {
                state.players.forEach(p => p._socket?.emit('lobby.waiting-players-update', {
                    players: state.players.map(a => a.name),
                    gameType: (state as any).data.gameType?.id,
                }));
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
    matchmaker.addLobby(lobby as Lobby<any>);
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
    
    const server = http.createServer(app).listen(port, () => {
        // tslint:disable-next-line:no-console
        console.log(`Listening at http://localhost:${port}/`);
    });
    
    // @ts-expect-error socketio does have a call signature
    const io: socketio.Server = socketio(server);
    
    io.on('connection', (socket) => {
        let isResolving = false;
        let resolver: (s: string) => void;
        const secretTokenPromise = new Promise<string>(resolve => resolver = resolve);

        socket.on('disconnect', wrapThrowing(() => {
            console.log("Socket disconnected", socket.id);
        }));
        
        socket.on('lobby.get-lobby-ids', wrapThrowing(async (resp) => {
            if (typeof resp !== 'function') throw new Error(`resp not a callback!`);
            const player = allPlayersByToken.get(await secretTokenPromise);
            if (player === undefined || player.inGame) return false;
            resp([...matchmaker.getLobbies(player.player)].map(l => l.id));
        }));

        socket.on('server.check-version', wrapThrowing((version) => {
            if (version !== INCREMENTAL_VERSION) {
                console.log(`Telling socket ${socket.id} to reconnect`);
                socket.emit('server.force-reload');
            }
        }));

        socket.on('lobby.can-reconnect', wrapThrowing((token, lobbyId, resp) => {
            if (typeof token !== 'string') throw new Error(`Token is not a string!`);
            if (lobbyId !== null && typeof lobbyId !== 'string') throw new Error(`Lobby ID is not null or a string!`);
            if (typeof resp !== 'function') throw new Error(`Response callback is not a function!`);

            const player = allPlayersByToken.get(token);
            if (player === undefined) resp(false);
            else if (player.inGame) resp(lobbyId === null || lobbyIdForPlayer.get(player.player) === lobbyId);
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
                return;
            }
            console.log(`Player reconnected! Welcome back`);
            isResolving = true;
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

            if (!isResolving) {
                isResolving = true;
                resolver((await util.promisify(crypto.randomBytes)(32)).toString('base64'));
            }
            if (allPlayersByToken.has(await secretTokenPromise)) {
                console.log(`Player who already joined a game tried to join again!`);
                socket.emit('lobby.error', 'already-joined');
                return;
            }

            const lobby = matchmaker.getLobby(data);
            if (lobby === undefined) {
                console.log(`Lobby with id ${data} doesn't exist!`);
                socket.emit('lobby.error', 'unknown-lobby-id');
                return;
            }

            const lobbyState = matchmaker.getLobbyState(lobby);
            if (lobbyState?.inGame) {
                addSpectator(lobbyState.game, socket);
                console.log("Socket became a spectator");
            } else {
                console.log("About to queue socket");
                const res = matchmaker.queuePlayer(await createLobbyPlayer(name, await secretTokenPromise, socket), [lobby]);
                if (res.length !== 1 || res[0] !== 'success') {
                    console.log(`Error joining lobby: ${JSON.stringify(res)}`);
                    socket.emit('lobby.error', 'cant-join-lobby', res[0]);
                    return;
                }
                console.log("Socket successfully joined lobby");
            }
        }));
    
        socket.on('lobby.set-game-option', wrapThrowing(async (gameOption: unknown, lobbyId: unknown, ...args: unknown[]) => {
            if (typeof gameOption !== 'string') throw new Error(`Game option not a string!`);
            if (!lobbyId) lobbyId = 'default';
            if (typeof lobbyId !== 'string') throw new Error(`Lobby ID not a string!`);

            console.log(`Socket trying to set game option ${gameOption} of lobby ${lobbyId}`);

            const lobby = matchmaker.getLobby(lobbyId);
            if (lobby === undefined) {
                console.log(`Lobby with id ${lobbyId} doesn't exist!`);
                socket.emit('lobby.error', 'unknown-lobby-id');
                return;
            }

            const state = matchmaker.getLobbyState(lobby);
            const player = allPlayersByToken.get(await secretTokenPromise);
            if (player === undefined || player.inGame || !matchmaker.isInLobby(player.player, lobby) || state === null || state.inGame) {
                console.log(`The player is not in this waiting lobby or it doesn't exist!`);
                socket.emit('lobby.error', 'not-in-waiting-lobby');
                return;
            }

            switch (gameOption) {
                case 'game-type': {
                    const gameTypeId = args[0];
                    if (typeof gameTypeId !== 'string') throw new Error('Game type not a string!');
                    matchmaker.updateLobbyData(
                        lobby,
                        a => (a.gameType = gameTypes.get(gameTypeId) ?? throwExp(new Error(`Game type doesn't exist!`)), a)
                    );
                    break;
                }
                case 'request-start-game': {
                    matchmaker.startGame(lobby);
                    break;
                }
                default: {
                    throw new Error(`Unknown game option!`);
                }
            }
        }));

        console.log();
        console.log("Socket connected", socket.id);
    });
}
