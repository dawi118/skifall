import type { Party, PartyKitServer, Connection } from "partykit/server";

interface Player {
  id: string;
  name: string;
  color: string;
}

interface RoomState {
  players: Map<string, Player>;
}

export default class SkiFallServer implements PartyKitServer {
  state: RoomState;

  constructor(readonly room: Party) {
    this.state = {
      players: new Map(),
    };
  }

  onConnect(conn: Connection) {
    const player: Player = {
      id: conn.id,
      name: `Player ${this.state.players.size + 1}`,
      color: this.getRandomColor(),
    };
    
    this.state.players.set(conn.id, player);
    
    // Send welcome message to the new player
    conn.send(JSON.stringify({
      type: "welcome",
      playerId: conn.id,
      player,
      players: Array.from(this.state.players.values()),
    }));
    
    // Broadcast to all other players that someone joined
    this.room.broadcast(
      JSON.stringify({
        type: "player-joined",
        player,
        players: Array.from(this.state.players.values()),
      }),
      [conn.id]
    );
    
    console.log(`[${this.room.id}] Player connected: ${conn.id} (${this.state.players.size} total)`);
  }

  onClose(conn: Connection) {
    this.state.players.delete(conn.id);
    
    // Broadcast to remaining players
    this.room.broadcast(
      JSON.stringify({
        type: "player-left",
        playerId: conn.id,
        players: Array.from(this.state.players.values()),
      })
    );
    
    console.log(`[${this.room.id}] Player disconnected: ${conn.id} (${this.state.players.size} remaining)`);
  }

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Connection) {
    if (typeof message !== 'string') return;
    
    try {
      const data = JSON.parse(message);
      console.log(`[${this.room.id}] Message from ${sender.id}:`, data.type);
      
      // For now, just echo messages to all other players
      this.room.broadcast(message, [sender.id]);
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  }

  getRandomColor(): string {
    const colors = [
      "#EF4444", // red
      "#F97316", // orange
      "#EAB308", // yellow
      "#22C55E", // green
      "#06B6D4", // cyan
      "#3B82F6", // blue
      "#8B5CF6", // violet
      "#EC4899", // pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

