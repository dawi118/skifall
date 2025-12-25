import { formatCountdown } from '../lib/scoring';
import './Timer.css';

interface TimerProps {
  timeRemaining: number;
  isRunning: boolean;
  isExpired: boolean;
}

export function Timer({ timeRemaining, isRunning, isExpired }: TimerProps) {
  const displayTime = formatCountdown(timeRemaining);
  
  return (
    <div className={`timer ${isRunning ? 'running' : ''} ${isExpired ? 'expired' : ''}`}>
      <span className="timer-icon">⏱️</span>
      <span className="timer-value">{displayTime}</span>
    </div>
  );
}

