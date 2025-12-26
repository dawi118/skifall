import type { Party, PartyKitServer, Connection } from "partykit/server";
import { generatePlayerName } from "./player-names";
import { generateLevel, type Level } from "./level-generator";

const PLAYER_COLORS = [
  "#E11D48", // rose
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#84CC16", // lime
];

const PLAYER_AVATARS = [
  "🦊", "🐺", "🦅", "🐻", "🦌", "🐱", "🐶", "🦁",
  "🐯", "🐨", "🐼", "🦝", "🐮", "🐷", "🐸", "🐵",
];

interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

interface Point {
  x: number;
  y: number;
}

interface Line {
  id: string;
  points: Point[];
  playerId: string;
}

export default class SkiFallServer implements PartyKitServer {
  players: Map<string, Player> = new Map();
  lines: Map<string, Line> = new Map();
  level: Level | null = null;
  roundStartTime: number | null = null;

  constructor(readonly room: Party) {}

  onConnect(conn: Connection) {
    const playerIndex = this.players.size;
    const player: Player = {
      id: conn.id,
      name: generatePlayerName(),
      color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      avatar: PLAYER_AVATARS[playerIndex % PLAYER_AVATARS.length],
    };
    
    this.players.set(conn.id, player);

    if (!this.level) {
      this.level = generateLevel();
      this.roundStartTime = Date.now();
    }
    
    conn.send(JSON.stringify({
      type: "welcome",
      playerId: conn.id,
      player,
      players: Array.from(this.players.values()),
      level: this.level,
      roundStartTime: this.roundStartTime,
      lines: Array.from(this.lines.values()),
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
    
    // Remove all lines from this player
    const removedLineIds: string[] = [];
    for (const [lineId, line] of this.lines) {
      if (line.playerId === conn.id) {
        this.lines.delete(lineId);
        removedLineIds.push(lineId);
      }
    }
    
    this.room.broadcast(
      JSON.stringify({
        type: "player-left",
        playerId: conn.id,
        players: Array.from(this.players.values()),
        removedLineIds,
      })
    );
  }

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Connection) {
    if (typeof message !== 'string') return;
    
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'request-new-level') {
        this.level = generateLevel();
        this.roundStartTime = Date.now();
        this.lines.clear();
        this.room.broadcast(JSON.stringify({
          type: 'level-update',
          level: this.level,
          roundStartTime: this.roundStartTime,
        }));
        return;
      }
      
      if (data.type === 'line-add') {
        const line: Line = {
          id: data.line.id,
          points: data.line.points,
          playerId: sender.id,
        };
        this.lines.set(line.id, line);
        this.room.broadcast(JSON.stringify({
          type: 'line-add',
          line,
        }), [sender.id]);
        return;
      }
      
      if (data.type === 'line-remove') {
        const existingLine = this.lines.get(data.lineId);
        if (existingLine && existingLine.playerId === sender.id) {
          this.lines.delete(data.lineId);
          this.room.broadcast(JSON.stringify({
            type: 'line-remove',
            lineId: data.lineId,
          }), [sender.id]);
        }
        return;
      }
      
      if (data.type === 'lines-clear') {
        // Remove all lines for this player
        for (const [lineId, line] of this.lines) {
          if (line.playerId === sender.id) {
            this.lines.delete(lineId);
          }
        }
        this.room.broadcast(JSON.stringify({
          type: 'lines-clear',
          playerId: sender.id,
        }), [sender.id]);
        return;
      }
      
      if (data.type === 'skier-position') {
        this.room.broadcast(JSON.stringify({
          type: 'skier-position',
          playerId: sender.id,
          state: data.state,
          runState: data.runState,
        }), [sender.id]);
        return;
      }
      
      this.room.broadcast(message, [sender.id]);
    } catch {
      // Invalid JSON, ignore
    }
  }
}
