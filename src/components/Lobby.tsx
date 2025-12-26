import type { Player } from '../hooks/usePartySocket';
import './Lobby.css';

interface LobbyProps {
  roomCode: string;
  players: Player[];
  localPlayerId: string | null;
  totalRounds: number;
  roundOptions: number[];
  onSetReady: (isReady: boolean) => void;
  onSetTotalRounds: (rounds: number) => void;
}

export function Lobby({
  roomCode,
  players,
  localPlayerId,
  totalRounds,
  roundOptions,
  onSetReady,
  onSetTotalRounds,
}: LobbyProps) {
  const localPlayer = players.find(p => p.id === localPlayerId);
  const isReady = localPlayer?.isReady ?? false;
  const allReady = players.length > 0 && players.every(p => p.isReady);
  const readyCount = players.filter(p => p.isReady).length;

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1 className="lobby-title">SKI FALL</h1>
        
        <div className="room-code-section">
          <span className="room-code-label">Room Code</span>
          <span className="room-code">{roomCode}</span>
        </div>

        <div className="players-section">
          <h2 className="section-title">Players ({players.length})</h2>
          <div className="player-list">
            {players.map(player => (
              <div 
                key={player.id} 
                className={`player-row ${player.isReady ? 'ready' : ''} ${player.id === localPlayerId ? 'local' : ''}`}
              >
                <span className="player-avatar" style={{ borderColor: player.color }}>
                  {player.avatar}
                </span>
                <span className="player-name">{player.name}</span>
                <span className={`ready-badge ${player.isReady ? 'ready' : 'not-ready'}`}>
                  {player.isReady ? '✓ Ready' : 'Waiting...'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h2 className="section-title">Settings</h2>
          <div className="setting-row">
            <span className="setting-label">Rounds</span>
            <div className="round-selector">
              {roundOptions.map(option => (
                <button
                  key={option}
                  className={`round-option ${totalRounds === option ? 'selected' : ''}`}
                  onClick={() => onSetTotalRounds(option)}
                  disabled={isReady}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ready-section">
          <button
            className={`ready-button ${isReady ? 'is-ready' : ''}`}
            onClick={() => onSetReady(!isReady)}
          >
            {isReady ? 'Cancel Ready' : "I'm Ready!"}
          </button>
          <p className="ready-status">
            {allReady 
              ? 'Starting game...' 
              : `${readyCount}/${players.length} players ready`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

