import { useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { GameCanvas } from "./components/GameCanvas";
import { PlayerAvatars } from "./components/PlayerAvatars";
import { usePartySocket } from "./hooks/usePartySocket";
import "./App.css";

type Screen = "home" | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [roomId, setRoomId] = useState<string | null>(null);

  const {
    isConnected,
    playerId,
    players,
    level,
    roundStartTime,
    requestNewLevel,
  } = usePartySocket(roomId);

  const handleJoinRoom = (code: string) => {
    setRoomId(code);
    setScreen("game");
  };

  if (screen === "home") {
    return <HomeScreen onJoinRoom={handleJoinRoom} />;
  }

  return (
    <>
      <GameCanvas
        serverLevel={level}
        serverRoundStartTime={roundStartTime}
        onRequestNewLevel={requestNewLevel}
      />

      {isConnected && (
        <PlayerAvatars players={players} localPlayerId={playerId} />
      )}
    </>
  );
}

export default App;
