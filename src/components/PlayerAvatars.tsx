import type { Player } from '../hooks/usePartySocket';
import './PlayerAvatars.css';

interface PlayerAvatarsProps {
  players: Player[];
  localPlayerId: string | null;
  onHoverPlayer?: (playerId: string | null) => void;
}

export function PlayerAvatars({ players, localPlayerId, onHoverPlayer }: PlayerAvatarsProps) {
  return (
    <div className="player-avatars">
      {players.map((player) => {
        const isLocal = player.id === localPlayerId;
        return (
          <div
            key={player.id}
            className={`player-avatar ${isLocal ? 'local' : ''}`}
            style={{ borderColor: player.color }}
            onMouseEnter={() => !isLocal && onHoverPlayer?.(player.id)}
            onMouseLeave={() => !isLocal && onHoverPlayer?.(null)}
          >
            <span className="avatar-emoji">{player.avatar}</span>
          </div>
        );
      })}
    </div>
  );
}

