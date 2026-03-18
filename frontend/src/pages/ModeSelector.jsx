import "./ModeSelector.css";

import { useState } from "react";
import GuessPokemon from "./GuessPokemon";

function ModeSelector({ user, onReturnToMenu, onGameStart, onGameEnd }) {
  const [mode, setMode] = useState(null);

  const handleVolver = async () => {
    // Refresca el score antes de volver al menú
    await onReturnToMenu();
    setMode(null);
  };

  if (mode === "single") {
    return (
      <div>
        <button onClick={handleVolver}>← Volver</button>
        <GuessPokemon
          user={user}
          onGameStart={onGameStart}
          onGameEnd={onGameEnd}
        />
      </div>
    );
  }

  if (mode === "multi") {
    return (
      <div>
        <button onClick={handleVolver}>← Volver</button>
        <p>Modo multijugador — próximamente.</p>
      </div>
    );
  }

  return (
    <div className="mode-selector-container">
      <h2>Bienvenido, {user.name}</h2>
      <p>Puntuación: {user.score}</p>

      <h3>Elige modo de juego</h3>

      <div className="mode-buttons">
        <button className="mode-button" onClick={() => setMode("single")}>
          Individual
        </button>
        <button className="mode-button" onClick={() => setMode("multi")}>
          Multijugador
        </button>
      </div>
    </div>
  );
}

export default ModeSelector;
