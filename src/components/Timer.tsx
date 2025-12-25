import './Timer.css';

interface TimerProps {
  timeRemaining: number;
  isFinished: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export function Timer({ timeRemaining, isFinished }: TimerProps) {
  const isLow = timeRemaining <= 10 && timeRemaining > 0;

  return (
    <div className={`timer ${isLow ? 'low' : ''} ${isFinished ? 'finished' : ''}`}>
      {isFinished ? '🏁 FINISH!' : formatTime(timeRemaining)}
    </div>
  );
}
