import {assertNonNull, first} from 'src/common/utils';
import PossiblyWeakMap from 'src/common/PossiblyWeakMap';

export type MatchmakerTypeArgs<P = any, G = any> = {
    P: P,
    G: G,
};

export type LobbyTypeArgs<M extends MatchmakerTypeArgs = MatchmakerTypeArgs, LData = any, PData = any> = {
    M: M,
    P: M['P'],
    G: M['G'],
    LData: LData,
    PData: PData,
};

export type LobbyState<T extends LobbyTypeArgs> = null | (
    {lobby: Lobby<T>, data: T['LData']} & (
        {inGame: false, players: T['P'][]} |
        {inGame: true, game: T['G']}
    )
);

export type LobbyType<T extends LobbyTypeArgs> = {
    readonly id: string,
    readonly maxPlayerCount: number,
    readonly startGame: (lobby: Lobby<T>, lobbyData: T['LData'], onClose: () => void, p: Map<T['P'], T['PData']>) => T['G'],
    readonly defaultLobbyData: () => T['LData'],
    readonly defaultPlayerData: () => T['PData'],
};

export type Lobby<T extends LobbyTypeArgs> = {
    readonly id: string,
    readonly type: LobbyType<T>,
    readonly afterUpdate?: (e: LobbyState<T>, m: Matchmaker<T['M']>) => void,
    readonly expire?: number | undefined,
    readonly autoRefresh: boolean
};

type LTA<T extends MatchmakerTypeArgs> = LobbyTypeArgs<T, any, any>;
type LLobby<T extends MatchmakerTypeArgs> = Lobby<LTA<T>>;

// TODO remove expired objects from the maps
export default class Matchmaker<T extends MatchmakerTypeArgs> {
    private readonly unsentUpdates = new Set<LLobby<T>>();
    private readonly allLobbies = new Map<string, LLobby<T>>();
    private readonly joinableLobbies = new WeakMap<LLobby<T>, Map<T['P'], unknown>>();
    private readonly inGameLobbies = new WeakMap<LLobby<T>, T['G']>();
    private readonly players = new PossiblyWeakMap<T['P'], Set<LLobby<T>>>();
    private readonly lobbyData = new WeakMap<LLobby<T>, unknown>();

    public constructor(...lobbies: LLobby<T>[]) {
        for (const lobby of lobbies) {
            this.addLobby(lobby);
        }
    }

    public addLobby(lobby: LLobby<T>): void {
        if (this.allLobbies.has(lobby.id)) throw new Error(`A lobby with this ID already exists`);
        this.allLobbies.set(lobby.id, lobby);
        this.joinableLobbies.set(lobby, new Map());
        this.lobbyData.set(lobby, lobby.type.defaultLobbyData());
        this.sendUpdateSoon(lobby);
    }

    public hasExpired(lobby: LLobby<T>): boolean {
        return lobby.expire === undefined ? false : lobby.expire <= Date.now();
    }

    public getLobby(id: string): LLobby<T> | undefined {
        return this.allLobbies.get(id);
    }

    public getLobbyState<LData, RData>(lobby: Lobby<LobbyTypeArgs<T, LData, RData>>): LobbyState<LobbyTypeArgs<T, LData, RData>> {
        const data = this.getLobbyData(lobby);
        const players = this.joinableLobbies.get(lobby);
        if (players !== undefined) return {inGame: false, players: [...players.keys()], lobby, data};
        const game = this.inGameLobbies.get(lobby);
        if (game !== undefined) return {inGame: true, game, lobby, data};
        return null;
    }

    public getLobbyData<LData>(lobby: Lobby<LobbyTypeArgs<T, LData, any>>): LData {
        return this.lobbyData.get(lobby) as LData;
    }

    public updateLobbyData<LData>(lobby: Lobby<LobbyTypeArgs<T, LData, any>>, updater: (a: LData) => LData): void {
        this.setLobbyData(lobby, updater(this.getLobbyData(lobby)));
    }

    public setLobbyData<LData>(lobby: Lobby<LobbyTypeArgs<T, LData, any>>, data: LData): void {
        this.lobbyData.set(lobby, data);
        this.sendUpdateSoon(lobby);
    }

    public queuePlayer(player: T['P'], lobbies: LLobby<T>[]): ("unknown" | "ingame" | "full" | "expired" | "success")[] {
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
            players.set(player, lobby.type.defaultPlayerData());
            this.sendUpdateSoon(lobby);
        }

        return result;
    }

    public unqueuePlayer(player: T['P']): void {
        return this.unqueuePlayers([player]);
    }

    public unqueuePlayers(players: T['P'][]): void {
        const playerSet = new Set(players);

        const lobbies: Set<LLobby<T>> = players.reduce(
            (s, p) => (this.players.get(p)?.forEach(l => s.add(l)), s), new Set<LLobby<T>>()
        );

        lobbies.forEach(q => this.joinableLobbies.has(q) && this.joinableLobbies.set(
            q,
            new Map([...(assertNonNull(this.joinableLobbies.get(q))).entries()].filter(p => !playerSet.has(p[0])))
        ));

        lobbies.forEach(lobby => this.sendUpdateSoon(lobby));

        players.forEach(p => this.players.delete(p));
    }

    public getLobbies(player: T['P']): Set<LLobby<T>> {
        return this.players.get(player) ?? new Set();
    }

    public isInLobby(player: T['P'], lobby: LLobby<T>): boolean {
        return this.getLobbies(player).has(lobby);
    }

    public startGame(lobby: LLobby<T>, playerCount?: number): void {
        const waitingPlayers = this.joinableLobbies.get(lobby);
        if (waitingPlayers === undefined) throw new Error("Given lobby is not waiting for a game!");

        if (playerCount === undefined) playerCount = Math.min(lobby.type.maxPlayerCount, waitingPlayers.size);
        if (!Number.isInteger(playerCount)) throw new Error("Player count not an integer!");
        if (playerCount < 1 || playerCount > waitingPlayers.size) {
            throw new Error(`Player count ${playerCount} not in [1, ${waitingPlayers.size}]!`);
        }
        if (!lobby.autoRefresh && waitingPlayers.size > playerCount) {
            throw new Error("Too many players in lobby! This lobby does not auto-refresh");
        }

        const players = new Map<T['P'], unknown>();
        for (let i = 0; i < playerCount; i++) {
            const f = first(waitingPlayers);
            waitingPlayers.delete(f[0]);
            players.set(f[0], f[1]);
        }

        let isClosed = false;
        const ogOnClose = () => void (isClosed = true, this.sendUpdateSoon(lobby));
        const onClose = lobby.autoRefresh ? ogOnClose : () => void (this.removeInGameLobby(lobby), ogOnClose());

        if (!lobby.autoRefresh) this.joinableLobbies.delete(lobby);
        const game = lobby.type.startGame(lobby, this.getLobbyData(lobby), onClose, players);
        if (!lobby.autoRefresh && !isClosed) this.inGameLobbies.set(lobby, game);

        this.unqueuePlayers([...players.keys()]);
        this.sendUpdateSoon(lobby);
    }

    private removeInGameLobby(lobby: LLobby<T>) {
        this.allLobbies.delete(lobby.id);
        this.inGameLobbies.delete(lobby);
    }

    public forceUpdateSoon(lobby: LLobby<T>): void {
        this.sendUpdateSoon(lobby);
    }

    private sendUpdateSoon(lobby: LLobby<T>) {
        if (!this.unsentUpdates.has(lobby)) {
            setTimeout(() => {
                lobby.afterUpdate?.(this.getLobbyState(lobby), this);
                this.unsentUpdates.delete(lobby);
            }, 0);
            this.unsentUpdates.add(lobby);
        }
    }

    public getInfo(playerMap: (p: T['P']) => any, gameMap: (g: T['G']) => any): unknown {
        return {
            lobbyInfo: [...this.allLobbies.values()],
        };
    }
}
