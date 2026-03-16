import { useState } from "react";
import GuessPokemon from "./GuessPokemon";

function ModeSelector({ user }) {
  const [mode, setMode] = useState(null);

  if (mode === "single") {
    return (
      <div>
        <button onClick={() => setMode(null)}>← Volver</button>
        <GuessPokemon user={user} />
      </div>
    );
  }

  if (mode === "multi") {
    return (
      <div>
        <button onClick={() => setMode(null)}>← Volver</button>
        <p>Modo multijugador — próximamente.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Bienvenido, {user.name}</h2>
      <p>Puntuación: {user.score}</p>

      <h3>Elige modo de juego</h3>

      <button onClick={() => setMode("single")}>Individual</button>
      <button onClick={() => setMode("multi")}>Multijugador</button>
    </div>
  );
}

export default ModeSelector;
