import { useState } from 'react';
import { generateRoomCode, isValidRoomCode } from '../lib/room-codes';
import backgroundGif from '../assets/images/homepage chalet advanced.gif';
import logoImage from '../assets/images/skifall_logo_transparent.png';
import './HomeScreen.css';

interface HomeScreenProps {
  onJoinRoom: (roomId: string) => void;
}

export function HomeScreen({ onJoinRoom }: HomeScreenProps) {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
      <div 
        className="background-layer"
        style={{ backgroundImage: `url(${backgroundGif})` }}
      />
      <div className="content-layer">
        <img src={logoImage} alt="SKI FALL" className="game-logo" />

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
    </div>
  );
}





