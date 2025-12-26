import { useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { Lobby } from "./components/Lobby";
import { GameCanvas } from "./components/GameCanvas";
import { PlayerAvatars } from "./components/PlayerAvatars";
import { usePartySocket } from "./hooks/usePartySocket";
import "./App.css";

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);

  const {
    isConnected,
    playerId,
    localPlayer,
    players,
    gamePhase,
    level,
    roundStartTime,
    currentRound,
    totalRounds,
    roundOptions,
    remoteLines,
    remoteSkiers,
    setReady,
    setTotalRoundsOption,
    sendPlayerFinished,
    playAgain,
    requestNewLevel,
    sendLineAdd,
    sendLineRemove,
    sendSkierPosition,
  } = usePartySocket(roomId);

  const handleJoinRoom = (code: string) => {
    setRoomId(code);
  };

  if (!roomId) {
    return <HomeScreen onJoinRoom={handleJoinRoom} />;
  }

  if (isConnected && gamePhase === 'lobby') {
    return (
      <Lobby
        roomCode={roomId}
        players={players}
        localPlayerId={playerId}
        totalRounds={totalRounds}
        roundOptions={roundOptions}
        onSetReady={setReady}
        onSetTotalRounds={setTotalRoundsOption}
      />
    );
  }

  return (
    <>
      <GameCanvas
        serverLevel={level}
        serverRoundStartTime={roundStartTime}
        remoteLines={remoteLines}
        remoteSkiers={remoteSkiers}
        players={players}
        localPlayer={localPlayer}
        hoveredPlayerId={hoveredPlayerId}
        gamePhase={gamePhase}
        currentRound={currentRound}
        totalRounds={totalRounds}
        onRequestNewLevel={requestNewLevel}
        onLineAdd={sendLineAdd}
        onLineRemove={sendLineRemove}
        onSkierPosition={sendSkierPosition}
        onPlayerFinished={sendPlayerFinished}
        onSetReady={setReady}
        onPlayAgain={playAgain}
      />

      {isConnected && (
        <PlayerAvatars 
          players={players} 
          localPlayerId={playerId}
          onHoverPlayer={setHoveredPlayerId}
        />
      )}
    </>
  );
}

export default App;
