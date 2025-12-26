import type { Player } from '../hooks/usePartySocket';
import { SkierAvatar } from './SkierAvatar';
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
            className={`player-avatar-wrapper ${isLocal ? 'local' : ''}`}
            onMouseEnter={() => !isLocal && onHoverPlayer?.(player.id)}
            onMouseLeave={() => !isLocal && onHoverPlayer?.(null)}
          >
            <SkierAvatar character={player.character} size={64} />
          </div>
        );
      })}
    </div>
  );
}
