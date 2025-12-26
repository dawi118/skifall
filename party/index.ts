import type { Party, PartyKitServer, Connection } from "partykit/server";
import { generatePlayerName } from "./player-names";
import { generateLevel, type Level } from "./level-generator";

const PLAYER_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
];

interface Player {
  id: string;
  name: string;
  color: string;
}

export default class SkiFallServer implements PartyKitServer {
  players: Map<string, Player> = new Map();
  level: Level | null = null;

  constructor(readonly room: Party) {}

  onConnect(conn: Connection) {
    const player: Player = {
      id: conn.id,
      name: generatePlayerName(),
      color: PLAYER_COLORS[this.players.size % PLAYER_COLORS.length],
    };
    
    this.players.set(conn.id, player);

    if (!this.level) {
      this.level = generateLevel();
    }
    
    conn.send(JSON.stringify({
      type: "welcome",
      playerId: conn.id,
      player,
      players: Array.from(this.players.values()),
      level: this.level,
    }));
    
    this.room.broadcast(
      JSON.stringify({
        type: "player-joined",
        player,
        players: Array.from(this.players.values()),
      }),
      [conn.id]
    );
  }

  onClose(conn: Connection) {
    this.players.delete(conn.id);
    
    this.room.broadcast(
      JSON.stringify({
        type: "player-left",
        playerId: conn.id,
        players: Array.from(this.players.values()),
      })
    );
  }

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Connection) {
    if (typeof message !== 'string') return;
    
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'request-new-level') {
        this.level = generateLevel();
        this.room.broadcast(JSON.stringify({
          type: 'level-update',
          level: this.level,
        }));
        return;
      }
      
      this.room.broadcast(message, [sender.id]);
    } catch {
      // Invalid JSON, ignore
    }
  }
}
