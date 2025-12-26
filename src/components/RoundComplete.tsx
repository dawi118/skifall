import { formatTime } from '../lib/scoring';
import type { Player } from '../hooks/usePartySocket';
import './RoundComplete.css';

interface RoundCompleteProps {
  players: Player[];
  localPlayerId: string | null;
  currentRound: number;
  totalRounds: number;
  isGameOver: boolean;
  onReady: () => void;
  onPlayAgain?: () => void;
}

export function RoundComplete({ 
  players, 
  localPlayerId, 
  currentRound, 
  totalRounds,
  isGameOver,
  onReady,
  onPlayAgain,
}: RoundCompleteProps) {
  const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
  const localPlayer = players.find(p => p.id === localPlayerId);
  const isReady = localPlayer?.isReady ?? false;
  const readyCount = players.filter(p => p.isReady).length;
  const allReady = players.length > 0 && players.every(p => p.isReady);
  
  return (
    <div className="round-complete-overlay">
      <div className="round-complete-card">
        <div className="round-header">
          {isGameOver ? (
            <>
              <div className="round-complete-icon">🏆</div>
              <h2 className="round-complete-title">Game Over!</h2>
            </>
          ) : (
            <>
              <div className="round-complete-icon">🏁</div>
              <h2 className="round-complete-title">Round {currentRound} Complete</h2>
              <p className="round-subtitle">{totalRounds - currentRound} rounds remaining</p>
            </>
          )}
        </div>
        
        <div className="leaderboard">
          <div className="leaderboard-header">
            <span className="lb-rank">Rank</span>
            <span className="lb-player">Player</span>
            <span className="lb-round">Round</span>
            <span className="lb-total">Total</span>
          </div>
          {sortedPlayers.map((player, index) => {
            const isLocal = player.id === localPlayerId;
            const roundResult = player.roundResult;
            const roundDisplay = roundResult 
              ? (roundResult.finishTime !== null 
                  ? formatTime(roundResult.finishTime) 
                  : 'DNF')
              : '—';
            const roundScore = roundResult?.score ?? 0;
            
            return (
              <div 
                key={player.id} 
                className={`leaderboard-row ${isLocal ? 'local' : ''} ${player.isReady ? 'ready' : ''}`}
              >
                <span className="lb-rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="lb-player">
                  <span className="player-avatar-small" style={{ borderColor: player.color }}>
                    {player.avatar}
                  </span>
                  <span className="player-name-text">{player.name}</span>
                  {player.isReady && <span className="ready-check">✓</span>}
                </span>
                <span className="lb-round">
                  <span className="round-time">{roundDisplay}</span>
                  <span className="round-score">+{roundScore}</span>
                </span>
                <span className="lb-total">{player.totalScore}</span>
          </div>
            );
          })}
        </div>
        
        <div className="round-complete-actions">
          {isGameOver ? (
            <button className="next-level-btn" onClick={onPlayAgain}>
              Play Again
          </button>
          ) : (
            <>
              <button 
                className={`next-level-btn ${isReady ? 'is-ready' : ''}`} 
                onClick={onReady}
                disabled={isReady}
              >
                {isReady ? 'Waiting for others...' : 'Ready for Next Round →'}
          </button>
              <p className="ready-count">
                {allReady ? 'Starting next round...' : `${readyCount}/${players.length} ready`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
