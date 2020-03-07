import {assertNonNull} from 'src/common/utils';

export type LobbyState<P, G> = null | (
    ({inGame: false, players: P[]} | {inGame: true, game: G})
    & {lobby: Lobby<P, G>}
);

export type LobbyType<P, G> = {
    readonly id: string,
    readonly maxPlayerCount: number,
    readonly startGame: (onClose: () => void, ...p: P[]) => G;
};

export type Lobby<P, G> = {
    readonly id: string,
    readonly type: LobbyType<P, G>,
    readonly afterUpdate?: (e: LobbyState<P, G>, m: Matchmaker<P, G>) => void,
    readonly expire?: number,
    readonly autoRefresh: boolean
};

// TODO remove expired objects from the maps
export default class Matchmaker<P, G> {
    private readonly unsentUpdates: Set<Lobby<P, G>> = new Set();
    private readonly allLobbies: Map<string, Lobby<P, G>> = new Map();
    private readonly joinableLobbies: Map<Lobby<P, G>, P[]> = new Map(); // TODO replace P[] with a linked set to allow fast en- and dequeuing, currently unqueuePlayers (hence also tryStartGame and queuePlayer) is O(number of players in game queue) which could be used in a DoS attack
    private readonly inGameLobbies: Map<Lobby<P, G>, G> = new Map();
    private readonly players: Map<P, Set<Lobby<P, G>>> = new Map();

    public constructor(...lobbies: Lobby<P, G>[]) {
        for (const lobby of lobbies) {
            this.addLobby(lobby);
        }
    }

    public addLobby(lobby: Lobby<P, G>) {
        if (this.allLobbies.has(lobby.id)) throw new Error(`A lobby with this ID already exists`);
        this.allLobbies.set(lobby.id, lobby);
        const players: P[] = [];
        this.joinableLobbies.set(lobby, players);
        this.sendUpdateSoon(lobby);
    }

    public hasExpired(lobby: Lobby<P, G>): boolean {
        return lobby.expire === undefined ? false : lobby.expire <= Date.now();
    }

    public getLobby(id: string): Lobby<P, G> | undefined {
        return this.allLobbies.get(id);
    }

    public getLobbyState(lobby: Lobby<P, G>): LobbyState<P, G> {
        const players = this.joinableLobbies.get(lobby);
        if (players !== undefined) return {inGame: false, players, lobby};
        const game = this.inGameLobbies.get(lobby);
        if (game !== undefined) return {inGame: true, game, lobby};
        return null;
    }

    public queuePlayer(player: P, lobbies: Lobby<P, G>[]): ("unknown" | "ingame" | "full" | "expired" | "success")[] {
        const result = lobbies.map(lobby => {
            const state = this.getLobbyState(lobby);
            if (state === null) return 'unknown';
            if (state.inGame) return 'ingame';
            if (!lobby.autoRefresh && state.players.length >= lobby.type.maxPlayerCount) return 'full';
            if (this.hasExpired(lobby)) return 'expired';
            return 'success';
        });
        lobbies = lobbies.filter((_, i) => result[i] === 'success');

        this.unqueuePlayer(player);

        const lobbySet = new Set(lobbies);
        this.players.set(player, lobbySet);
        for (const lobby of lobbySet) {
            const players = assertNonNull(this.joinableLobbies.get(lobby));
            players.push(player);
            this.sendUpdateSoon(lobby);
        }

        return result;
    }

    public unqueuePlayer(player: P): void {
        return this.unqueuePlayers([player]);
    }

    public unqueuePlayers(players: P[]): void {
        const playerSet = new Set(players);

        const lobbies: Set<Lobby<P, G>> = players.reduce(
            (s, p) => this.players.get(p)?.forEach(l => s.add(l)) || s, new Set<Lobby<P, G>>()
        );

        lobbies.forEach(q => this.joinableLobbies.has(q) && this.joinableLobbies.set(
            q,
            (this.joinableLobbies.get(q) as P[]).filter(p => !playerSet.has(p))
        ));

        players.forEach(p => this.players.delete(p));
    }

    public startGame(lobby: Lobby<P, G>, playerCount?: number) {
        const waitingPlayers = this.joinableLobbies.get(lobby);
        if (waitingPlayers === undefined) throw new Error("Given lobby is not waiting for a game!");

        if (playerCount === undefined) playerCount = Math.min(lobby.type.maxPlayerCount, waitingPlayers.length);
        if (!Number.isInteger(playerCount)) throw new Error("Player count not an integer!");
        if (playerCount < 1 || playerCount > waitingPlayers.length) {
            throw new Error(`Player count ${playerCount} not in [1, ${waitingPlayers.length}]!`);
        }
        if (!lobby.autoRefresh && waitingPlayers.length > playerCount) {
            throw new Error("Too many players in lobby! This lobby does not auto-refresh");
        }

        const players = waitingPlayers.slice(0, playerCount);

        let isClosed = false;
        const ogOnClose = () => (isClosed = true, this.sendUpdateSoon(lobby));
        const onClose = lobby.autoRefresh ? ogOnClose : () => (this.removeInGameLobby(lobby), ogOnClose());

        if (!lobby.autoRefresh) this.joinableLobbies.delete(lobby);
        const game = lobby.type.startGame(onClose, ...players);
        if (!lobby.autoRefresh && !isClosed) this.inGameLobbies.set(lobby, game);

        this.unqueuePlayers(players);
        this.sendUpdateSoon(lobby);
    }

    private removeInGameLobby(lobby: Lobby<P, G>) {
        this.allLobbies.delete(lobby.id);
        this.inGameLobbies.delete(lobby);
    }

    private sendUpdateSoon(lobby: Lobby<P, G>) {
        if (!this.unsentUpdates.has(lobby)) {
            setTimeout(() => {
                lobby.afterUpdate?.(this.getLobbyState(lobby), this);
                this.unsentUpdates.delete(lobby);
            }, 0);
            this.unsentUpdates.add(lobby);
        }
    }

    public getInfo(playerMap: (p: P) => any, gameMap: (g: G) => any): {} {
        return {
            lobbyInfo: [...this.joinableLobbies.keys(), this.inGameLobbies.keys()],
            lobbies: Object.fromEntries([...this.joinableLobbies.entries()].map(a => [a[0].id, a[1].map(playerMap)])),
            inGame: Object.fromEntries([...this.inGameLobbies.entries()].map(a => [a[0].id, gameMap(a[1])]))
        };
    }
}