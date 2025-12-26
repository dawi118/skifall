import { useState } from 'react';
import { generateRoomCode, isValidRoomCode } from '../lib/room-codes';
import './HomeScreen.css';

interface HomeScreenProps {
  onJoinRoom: (roomId: string) => void;
}

interface Snowflake {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
}

function createSnowflakes(): Snowflake[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 3 + 4,
    delay: Math.random() * 5,
  }));
}

export function HomeScreen({ onJoinRoom }: HomeScreenProps) {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [snowflakes] = useState<Snowflake[]>(createSnowflakes);

  const handleCreate = () => {
    const code = generateRoomCode();
    setGeneratedCode(code);
    setMode('create');
  };

  const handleStartGame = () => {
    onJoinRoom(generatedCode);
  };

  const handleJoinSubmit = () => {
    const code = roomCode.toLowerCase().trim();
    if (!isValidRoomCode(code)) {
      setError('Invalid code format');
      return;
    }
    setError('');
    onJoinRoom(code);
  };

  const handleBack = () => {
    setMode('home');
    setRoomCode('');
    setError('');
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="home-screen">
      <div className="snow-container">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="snowflake"
            style={{
              left: `${flake.x}%`,
              width: flake.size,
              height: flake.size,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
            }}
          />
        ))}
      </div>

      <h1 className="game-title">
        <span className="title-ski">SKI</span>
        <span className="title-fall">FALL</span>
      </h1>

      {mode === 'home' && (
        <div className="floating-buttons">
          <button className="floating-btn primary" onClick={handleCreate}>
            Create Game
          </button>
          <button className="floating-btn secondary" onClick={() => setMode('join')}>
            Join Game
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="floating-panel">
          <div className="room-code-display" onClick={handleCopyCode}>
            {generatedCode}
            <span className={`copy-hint ${copied ? 'copied' : ''}`}>
              {copied ? 'copied!' : 'click to copy'}
            </span>
          </div>
          <div className="panel-buttons">
            <button className="floating-btn secondary small" onClick={handleBack}>← Back</button>
            <button className="floating-btn primary small" onClick={handleStartGame}>Start →</button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="floating-panel">
          <label className="input-label">type in your code</label>
          <input
            type="text"
            className="room-input"
            placeholder="verbier-matterhorn"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit()}
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <div className="panel-buttons">
            <button className="floating-btn secondary small" onClick={handleBack}>← Back</button>
            <button className="floating-btn primary small" onClick={handleJoinSubmit}>Join →</button>
          </div>
        </div>
      )}
    </div>
  );
}





