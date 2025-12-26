import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { GameCanvas } from './components/GameCanvas';
import { usePartySocket } from './hooks/usePartySocket';
import './App.css';

type Screen = 'home' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [roomId, setRoomId] = useState<string | null>(null);
  
  const { isConnected, localPlayer, players, level, requestNewLevel } = usePartySocket(roomId);

  const handleJoinRoom = (code: string) => {
    setRoomId(code);
    setScreen('game');
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    setScreen('home');
  };

  if (screen === 'home') {
    return <HomeScreen onJoinRoom={handleJoinRoom} />;
  }

  return (
    <>
      <GameCanvas serverLevel={level} onRequestNewLevel={requestNewLevel} />
      
      <div className="room-info">
        <div className="room-code">{roomId}</div>
        {localPlayer && (
          <div className="local-player" style={{ color: localPlayer.color }}>
            {localPlayer.name}
          </div>
        )}
        <div className="player-count">
          {isConnected 
            ? `${players.length} player${players.length !== 1 ? 's' : ''}`
            : 'Connecting...'}
        </div>
        <button className="leave-btn" onClick={handleLeaveRoom}>Leave</button>
      </div>
    </>
  );
}

export default App;
