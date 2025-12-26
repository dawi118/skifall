import { calculateScore, formatTime } from '../lib/scoring';
import './RoundComplete.css';

interface RoundCompleteProps {
  timeElapsed: number | null;
  onNextLevel: () => void;
}

export function RoundComplete({ timeElapsed, onNextLevel }: RoundCompleteProps) {
  const isDNF = timeElapsed === null;
  const score = calculateScore(timeElapsed);

  return (
    <div className="round-complete-overlay">
      <div className="round-complete-card">
        {isDNF ? (
          <>
            <div className="round-complete-icon">💥</div>
            <h2 className="round-complete-title dnf">DNF</h2>
            <p className="round-complete-subtitle">Did Not Finish</p>
          </>
        ) : (
          <>
            <div className="round-complete-icon">🏁</div>
            <h2 className="round-complete-title">Finished!</h2>
            <p className="round-complete-time">{formatTime(timeElapsed)}</p>
          </>
        )}

        <div className="round-complete-score">
          <span className="score-label">Score</span>
          <span className="score-value">{score}</span>
          <span className="score-max">/ 100</span>
        </div>

        <div className="round-complete-actions">
          <button className="next-level-btn" onClick={onNextLevel}>
            Next Level →
          </button>
        </div>
      </div>
    </div>
  );
}
