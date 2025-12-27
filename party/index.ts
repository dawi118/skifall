import type { Party, PartyKitServer, Connection } from "partykit/server";
import { generatePlayerName } from "./player-names";
import { generateLevel, type Level, type MovingObstacle, type Point } from "./level-generator";

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

const DEFAULT_TOTAL_ROUNDS = 5;
const ROUND_OPTIONS = [3, 5, 7, 10];

type GamePhase = 'lobby' | 'playing' | 'round-complete' | 'game-over';

interface RoundResult {
  finishTime: number | null; // null = DNF
  score: number;
}

interface PlayerState {
  id: string;
  name: string;
  color: string;
  avatar: string;
  character: number; // 1-4 for different skier sprites
  isReady: boolean;
  isSpectating: boolean;
  roundResult: RoundResult | null;
  totalScore: number;
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

function calculateScore(finishTime: number | null): number {
  if (finishTime === null) return 0;
  return Math.max(0, 100 - Math.floor(finishTime));
}

export default class SkiFallServer implements PartyKitServer {
  players: Map<string, PlayerState> = new Map();
  lines: Map<string, Line> = new Map();
  
  gamePhase: GamePhase = 'lobby';
  level: Level | null = null;
  roundStartTime: number | null = null;
  currentRound: number = 0;
  totalRounds: number = DEFAULT_TOTAL_ROUNDS;
  movingObstaclePositions: Map<string, Point> = new Map();
  obstacleUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(readonly room: Party) {}

  getActivePlayers(): PlayerState[] {
    return Array.from(this.players.values()).filter(p => !p.isSpectating);
  }

  broadcastGameState() {
    this.room.broadcast(JSON.stringify({
      type: 'game-state',
      gamePhase: this.gamePhase,
      players: Array.from(this.players.values()),
      level: this.level,
      roundStartTime: this.roundStartTime,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
    }));
  }

  checkAllPlayersReady(): boolean {
    const active = this.getActivePlayers();
    return active.length > 0 && active.every(p => p.isReady);
  }

  checkAllPlayersFinished(): boolean {
    const active = this.getActivePlayers();
    return active.length > 0 && active.every(p => p.roundResult !== null);
  }

  updateMovingObstacles() {
    if (!this.level || this.gamePhase !== 'playing') return;

    const currentTime = Date.now();
    const elapsed = this.roundStartTime ? (currentTime - this.roundStartTime) / 1000 : 0;

    for (const obstacle of this.level.movingObstacles) {
      const pattern = obstacle.movement;
      let newX = obstacle.basePosition.x;
      let newY = obstacle.basePosition.y;

      if (pattern.type === 'linear' && pattern.path && pattern.path.length >= 2) {
        const totalDist = Math.sqrt(
          Math.pow(pattern.path[1].x - pattern.path[0].x, 2) +
          Math.pow(pattern.path[1].y - pattern.path[0].y, 2)
        );
        const cycleTime = totalDist / pattern.speed;
        const t = (elapsed % (cycleTime * 2)) / cycleTime;
        const progress = t <= 1 ? t : 2 - t;
        newX = pattern.path[0].x + (pattern.path[1].x - pattern.path[0].x) * progress;
        newY = pattern.path[0].y + (pattern.path[1].y - pattern.path[0].y) * progress;
      } else if (pattern.type === 'oscillate' && pattern.amplitude && pattern.frequency) {
        const offset = pattern.amplitude * Math.sin(elapsed * pattern.frequency * Math.PI * 2);
        if (pattern.direction === 'vertical') {
          newY = obstacle.basePosition.y + offset;
        } else if (pattern.direction === 'horizontal') {
          newX = obstacle.basePosition.x + offset;
        }
      } else if (pattern.type === 'circular' && pattern.radius) {
        const angle = (elapsed * pattern.speed) / pattern.radius;
        newX = obstacle.basePosition.x + Math.cos(angle) * pattern.radius;
        newY = obstacle.basePosition.y + Math.sin(angle) * pattern.radius;
      }

      this.movingObstaclePositions.set(obstacle.id, { x: newX, y: newY });
    }

    this.room.broadcast(JSON.stringify({
      type: 'obstacle-positions',
      positions: Array.from(this.movingObstaclePositions.entries()).map(([id, pos]) => ({ id, position: pos })),
    }));
  }

  startRound() {
    this.currentRound++;
    this.level = generateLevel();
    this.roundStartTime = Date.now();
    this.lines.clear();
    this.movingObstaclePositions.clear();
    
    for (const player of this.players.values()) {
      player.isReady = false;
      player.roundResult = null;
      if (player.isSpectating) {
        player.isSpectating = false;
      }
    }
    
    this.gamePhase = 'playing';
    this.broadcastGameState();

    if (this.obstacleUpdateInterval) {
      clearInterval(this.obstacleUpdateInterval);
    }
    this.obstacleUpdateInterval = setInterval(() => this.updateMovingObstacles(), 66); // ~15Hz
    this.updateMovingObstacles();
  }

  endRound() {
    if (this.obstacleUpdateInterval) {
      clearInterval(this.obstacleUpdateInterval);
      this.obstacleUpdateInterval = null;
    }
    for (const player of this.players.values()) {
      player.isReady = false;
    }
    this.gamePhase = 'round-complete';
    this.broadcastGameState();
  }

  endGame() {
    this.gamePhase = 'game-over';
    this.broadcastGameState();
  }

  resetToLobby() {
    if (this.obstacleUpdateInterval) {
      clearInterval(this.obstacleUpdateInterval);
      this.obstacleUpdateInterval = null;
    }
    this.gamePhase = 'lobby';
    this.currentRound = 0;
    this.level = null;
    this.roundStartTime = null;
    this.lines.clear();
    this.movingObstaclePositions.clear();
    
    for (const player of this.players.values()) {
      player.isReady = false;
      player.isSpectating = false;
      player.roundResult = null;
      player.totalScore = 0;
    }
    
    this.broadcastGameState();
  }

  onConnect(conn: Connection) {
    if (this.players.size === 0 && this.gamePhase !== 'lobby') {
      this.gamePhase = 'lobby';
      this.currentRound = 0;
      this.level = null;
      this.roundStartTime = null;
      this.lines.clear();
    }
    
    const playerIndex = this.players.size;
    const isSpectating = this.gamePhase === 'playing';
    
    const player: PlayerState = {
      id: conn.id,
      name: generatePlayerName(),
      color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      avatar: PLAYER_AVATARS[playerIndex % PLAYER_AVATARS.length],
      character: (playerIndex % 4) + 1, // 1-4 for skier sprites
      isReady: false,
      isSpectating,
      roundResult: null,
      totalScore: 0,
    };
    
    this.players.set(conn.id, player);
    
    conn.send(JSON.stringify({
      type: "welcome",
      playerId: conn.id,
      gamePhase: this.gamePhase,
      players: Array.from(this.players.values()),
      level: this.level,
      roundStartTime: this.roundStartTime,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      lines: Array.from(this.lines.values()),
      roundOptions: ROUND_OPTIONS,
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

    // Check if game state should change due to player leaving
    if (this.gamePhase === 'lobby' && this.checkAllPlayersReady()) {
      this.startRound();
    } else if (this.gamePhase === 'playing' && this.checkAllPlayersFinished()) {
      this.endRound();
    } else if (this.gamePhase === 'round-complete' && this.checkAllPlayersReady()) {
      if (this.currentRound >= this.totalRounds) {
        this.endGame();
      } else {
        this.startRound();
      }
    }
  }

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Connection) {
    if (typeof message !== 'string') return;
    
    try {
      const data = JSON.parse(message);
      const player = this.players.get(sender.id);
      if (!player) return;
      
      if (data.type === 'set-ready') {
        player.isReady = data.isReady;
        
        if (this.gamePhase === 'lobby' && this.checkAllPlayersReady()) {
          this.startRound();
        } else if (this.gamePhase === 'round-complete' && this.checkAllPlayersReady()) {
          if (this.currentRound >= this.totalRounds) {
            this.endGame();
          } else {
            this.startRound();
          }
        } else {
          this.broadcastGameState();
        }
        return;
      }
      
      if (data.type === 'set-total-rounds') {
        if (this.gamePhase === 'lobby' && !player.isReady && ROUND_OPTIONS.includes(data.totalRounds)) {
          this.totalRounds = data.totalRounds;
          this.broadcastGameState();
        }
        return;
      }
      
      if (data.type === 'player-finished') {
        if (this.gamePhase === 'playing' && !player.isSpectating && !player.roundResult) {
          const finishTime = data.finishTime; // null for DNF
          const score = calculateScore(finishTime);
          player.roundResult = { finishTime, score };
          player.totalScore += score;
          
          this.room.broadcast(JSON.stringify({
            type: 'player-finished',
            playerId: sender.id,
            roundResult: player.roundResult,
            totalScore: player.totalScore,
          }));
          
          if (this.checkAllPlayersFinished()) {
            this.endRound();
          }
        }
        return;
      }
      
      if (data.type === 'play-again') {
        if (this.gamePhase === 'game-over') {
          this.resetToLobby();
        }
        return;
      }
      
      if (data.type === 'request-new-level') {
        // Dev mode: force new level
        this.level = generateLevel();
        this.roundStartTime = Date.now();
        this.lines.clear();
        for (const p of this.players.values()) {
          p.roundResult = null;
        }
        this.room.broadcast(JSON.stringify({
          type: 'level-update',
          level: this.level,
          roundStartTime: this.roundStartTime,
        }));
        return;
      }
      
      if (data.type === 'line-add') {
        if (player.isSpectating) return;
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
        if (player.isSpectating) return;
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
