import type { RoundResult } from '../hooks/useGameState';
import { formatTime } from '../lib/scoring';
import './RoundComplete.css';

interface RoundCompleteProps {
  result: RoundResult;
  onNextLevel: () => void;
  onRetry: () => void;
}

export function RoundComplete({ result, onNextLevel, onRetry }: RoundCompleteProps) {
  const isDNF = result.finishTime === null;
  
  return (
    <div className="round-complete-overlay">
      <div className="round-complete-card">
        <div className="round-complete-header">
          {isDNF ? (
            <>
              <span className="result-emoji">😵</span>
              <h2>Time's Up!</h2>
            </>
          ) : (
            <>
              <span className="result-emoji">🎿</span>
              <h2>Finish!</h2>
            </>
          )}
        </div>
        
        <div className="round-complete-stats">
          <div className="stat">
            <span className="stat-label">Time</span>
            <span className="stat-value">
              {isDNF ? 'DNF' : formatTime(result.finishTime!)}
            </span>
          </div>
          <div className="stat score">
            <span className="stat-label">Score</span>
            <span className="stat-value">{result.score} pts</span>
          </div>
        </div>
        
        <div className="round-complete-actions">
          <button className="btn-retry" onClick={onRetry}>
            ↺ Try Again
          </button>
          <button className="btn-next" onClick={onNextLevel}>
            Next Level →
          </button>
        </div>
      </div>
    </div>
  );
}

