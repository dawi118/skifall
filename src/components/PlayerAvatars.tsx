import type { Player } from '../hooks/usePartySocket';
import './PlayerAvatars.css';

interface PlayerAvatarsProps {
  players: Player[];
  localPlayerId: string | null;
}

export function PlayerAvatars({ players, localPlayerId }: PlayerAvatarsProps) {
  return (
    <div className="player-avatars">
      {players.map((player) => (
        <div
          key={player.id}
          className={`player-avatar ${player.id === localPlayerId ? 'local' : ''}`}
          style={{ borderColor: player.color }}
          title={player.name}
        >
          <span className="avatar-emoji">{player.avatar}</span>
          <div className="avatar-tooltip">{player.name}</div>
        </div>
      ))}
    </div>
  );
}

