import { useEffect, useState, useCallback, useRef } from 'react';
import PartySocket from 'partysocket';

export interface Player {
  id: string;
  name: string;
  color: string;
}

interface UsePartySocketReturn {
  isConnected: boolean;
  playerId: string | null;
  players: Player[];
  send: (data: unknown) => void;
  onMessage: (handler: (data: unknown) => void) => void;
}

const PARTYKIT_HOST = import.meta.env.DEV 
  ? 'localhost:1999' 
  : 'ski-fall.your-username.partykit.dev';

export function usePartySocket(roomId: string | null): UsePartySocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  
  const socketRef = useRef<PartySocket | null>(null);
  const messageHandlerRef = useRef<((data: unknown) => void) | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });

    socketRef.current = socket;

    socket.addEventListener('open', () => {
      console.log('[PartySocket] Connected to room:', roomId);
      setIsConnected(true);
    });

    socket.addEventListener('close', () => {
      console.log('[PartySocket] Disconnected from room:', roomId);
      setIsConnected(false);
      setPlayerId(null);
      setPlayers([]);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PartySocket] Message received:', data.type);

        switch (data.type) {
          case 'welcome':
            setPlayerId(data.playerId);
            setPlayers(data.players);
            break;
          case 'player-joined':
          case 'player-left':
            setPlayers(data.players);
            break;
          default:
            // Pass to custom handler
            if (messageHandlerRef.current) {
              messageHandlerRef.current(data);
            }
        }
      } catch (e) {
        console.error('[PartySocket] Failed to parse message:', e);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [roomId]);

  const send = useCallback((data: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  }, []);

  const onMessage = useCallback((handler: (data: unknown) => void) => {
    messageHandlerRef.current = handler;
  }, []);

  return {
    isConnected,
    playerId,
    players,
    send,
    onMessage,
  };
}

