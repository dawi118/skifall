import { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { usePartySocket } from './hooks/usePartySocket';
import './App.css';

function App() {
  const [roomId] = useState('test-room');
  const { isConnected, playerId, players } = usePartySocket(roomId);

  return (
    <>
      <GameCanvas />
      
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        background: isConnected ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: 8,
        fontFamily: 'system-ui',
        fontSize: 14,
        zIndex: 1000,
      }}>
        {isConnected 
          ? `🟢 Connected as ${playerId?.slice(0, 8)}... (${players.length} player${players.length !== 1 ? 's' : ''})`
          : '🔴 Connecting...'}
      </div>
    </>
  );
}

export default App;
