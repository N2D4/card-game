export type LobbyType<P> = {
    id: string,
    playerCount: number,
    startGame: (...p: P[]) => void;
};

export type Lobby<P> = {
    id: string,
    type: LobbyType<P>,
    expire?: number,
    autoRefresh: boolean
};

// TODO remove expired objects from the maps
export default class Matchmaker<P> {
    private allLobbies: Map<Lobby<P>, P[]> = new Map(); // TODO replace P[] with a linked set to allow fast en- and dequeuing, currently unqueuePlayers (hence also tryStartGame and queuePlayer) is O(number of players in game queue) which could be used in a DoS attack
    private players: Map<P, Set<Lobby<P>>> = new Map();

    public constructor(...lobbies: Lobby<P>[]) {
        for (const lobby of lobbies) {
            this.addLobby(lobby);
        }
    }

    public addLobby(lobby: Lobby<P>) {
        this.allLobbies.set(lobby, []);
    }

    public hasExpired(lobby: Lobby<P>): boolean {
        return lobby.expire === undefined ? false : lobby.expire <= Date.now();
    }

    public queuePlayer(player: P, lobbies: Lobby<P>[]): boolean[] {
        const result = lobbies.map(q => this.allLobbies.has(q) && !this.hasExpired(q));
        lobbies = lobbies.filter((_, i) => result[i] === true);

        this.unqueuePlayer(player);

        const lobbySet = new Set(lobbies);
        this.players.set(player, lobbySet);
        for (const q of lobbySet) {
            this.allLobbies.get(q)?.push(player);
        }

        lobbySet.forEach(l => this.tryStartGame(l));

        return result;
    }

    public unqueuePlayer(player: P): void {
        return this.unqueuePlayers([player]);
    }

    public unqueuePlayers(players: P[]): void {
        const playerSet = new Set(players);

        const lobbies: Set<Lobby<P>> = players.reduce(
            (s, p) => this.players.get(p)?.forEach(l => s.add(l)) || s, new Set<Lobby<P>>()
        );

        lobbies.forEach(q => this.allLobbies.has(q) && this.allLobbies.set(
            q,
            (this.allLobbies.get(q) as P[]).filter(p => !playerSet.has(p))
        ));

        players.forEach(p => this.players.delete(p));
    }

    private tryStartGame(lobby: Lobby<P>) {
        const waitingPlayers = this.allLobbies.get(lobby);
        if (waitingPlayers === undefined) throw new Error("Assertion error");

        const pc = lobby.type.playerCount;
        let i;
        for (i = 0; i + pc <= waitingPlayers.length; i += pc) {
            lobby.type.startGame(...waitingPlayers.slice(i, i + pc));
            if (!lobby.autoRefresh) {
                if (waitingPlayers.length > i + pc) throw new Error("Too many players in lobby!")
                this.allLobbies.delete(lobby);
            }
        }

        this.unqueuePlayers(waitingPlayers.slice(0, i));
    }

    public getInfo(playerMap: (p: P) => any): {} {
        return {
            lobbyInfo: [...this.allLobbies.keys()],
            lobbies: Object.fromEntries([...this.allLobbies.entries()].map(a => [a[0].id, a[1].map(playerMap)]))
        };
    }
}