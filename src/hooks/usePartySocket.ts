import { useEffect, useState, useCallback, useRef } from 'react';
import PartySocket from 'partysocket';
import type { Level } from '../lib/level-generator';

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

const PARTYKIT_HOST = import.meta.env.DEV 
  ? 'localhost:1999' 
  : 'ski-fall.your-username.partykit.dev';

export function usePartySocket(roomId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [level, setLevel] = useState<Level | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  
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
      setIsConnected(true);
    });

    socket.addEventListener('close', () => {
      setIsConnected(false);
      setPlayerId(null);
      setPlayers([]);
      setLevel(null);
      setRoundStartTime(null);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'welcome':
            setPlayerId(data.playerId);
            setPlayers(data.players);
            if (data.level) setLevel(data.level);
            if (data.roundStartTime) setRoundStartTime(data.roundStartTime);
            break;
          case 'player-joined':
          case 'player-left':
            setPlayers(data.players);
            break;
          case 'level-update':
            if (data.level) setLevel(data.level);
            if (data.roundStartTime) setRoundStartTime(data.roundStartTime);
            break;
          default:
            messageHandlerRef.current?.(data);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
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

  const requestNewLevel = useCallback(() => {
    send({ type: 'request-new-level' });
  }, [send]);

  const onMessage = useCallback((handler: (data: unknown) => void) => {
    messageHandlerRef.current = handler;
  }, []);

  const localPlayer = players.find(p => p.id === playerId) ?? null;

  return { isConnected, playerId, localPlayer, players, level, roundStartTime, send, requestNewLevel, onMessage };
}
