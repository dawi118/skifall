import { useEffect, useState, useCallback, useRef } from 'react';
import PartySocket from 'partysocket';
import type { Level } from '../lib/level-generator';
import type { Line, SkierRenderState, SkierState } from '../types';

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface RemoteLine extends Line {
  playerId: string;
}

export interface RemoteSkier {
  playerId: string;
  state: SkierRenderState;
  runState: SkierState;
  timestamp: number;
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
  const [remoteLines, setRemoteLines] = useState<RemoteLine[]>([]);
  const [remoteSkiers, setRemoteSkiers] = useState<Map<string, RemoteSkier>>(new Map());
  
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
      setRemoteLines([]);
      setRemoteSkiers(new Map());
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
            if (data.lines) setRemoteLines(data.lines);
            break;
          case 'player-joined':
            setPlayers(data.players);
            break;
          case 'player-left':
            setPlayers(data.players);
            if (data.removedLineIds) {
              setRemoteLines(prev => prev.filter(l => !data.removedLineIds.includes(l.id)));
            }
            setRemoteSkiers(prev => {
              const next = new Map(prev);
              next.delete(data.playerId);
              return next;
            });
            break;
          case 'level-update':
            if (data.level) setLevel(data.level);
            if (data.roundStartTime) setRoundStartTime(data.roundStartTime);
            setRemoteLines([]);
            setRemoteSkiers(new Map());
            break;
          case 'line-add':
            setRemoteLines(prev => [...prev, data.line]);
            break;
          case 'line-remove':
            setRemoteLines(prev => prev.filter(l => l.id !== data.lineId));
            break;
          case 'lines-clear':
            setRemoteLines(prev => prev.filter(l => l.playerId !== data.playerId));
            break;
          case 'skier-position':
            setRemoteSkiers(prev => {
              const next = new Map(prev);
              next.set(data.playerId, {
                playerId: data.playerId,
                state: data.state,
                runState: data.runState,
                timestamp: Date.now(),
              });
              return next;
            });
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

  const sendLineAdd = useCallback((line: Line) => {
    send({ type: 'line-add', line });
  }, [send]);

  const sendLineRemove = useCallback((lineId: string) => {
    send({ type: 'line-remove', lineId });
  }, [send]);

  const sendLinesClear = useCallback(() => {
    send({ type: 'lines-clear' });
  }, [send]);

  const sendSkierPosition = useCallback((state: SkierRenderState, runState: SkierState) => {
    send({ type: 'skier-position', state, runState });
  }, [send]);

  const onMessage = useCallback((handler: (data: unknown) => void) => {
    messageHandlerRef.current = handler;
  }, []);

  const localPlayer = players.find(p => p.id === playerId) ?? null;

  return { 
    isConnected, 
    playerId, 
    localPlayer, 
    players, 
    level, 
    roundStartTime, 
    remoteLines,
    remoteSkiers,
    send, 
    requestNewLevel,
    sendLineAdd,
    sendLineRemove,
    sendLinesClear,
    sendSkierPosition,
    onMessage,
  };
}
