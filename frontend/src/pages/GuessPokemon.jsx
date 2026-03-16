import { useState } from "react";
import { startGame, guessLetter } from "../services/api";

function GuessPokemon({ user }) {
  const [session, setSession] = useState(null);
  const [letra, setLetra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await startGame(user.id);
      setSession(data);
      setLetra("");
    } catch (err) {
      setError("Error al iniciar la partida. ¿Está el backend corriendo?");
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async () => {
    if (!letra || letra.length !== 1) return;
    setLoading(true);
    setError(null);
    try {
      const data = await guessLetter(user.id, letra);
      setSession(data);
      setLetra("");
    } catch (err) {
      setError("Error al enviar la letra.");
    } finally {
      setLoading(false);
    }
  };

  // Permite enviar con Enter además del botón
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleGuess();
  };

  return (
    <div>
      <h2>Adivina el Pokémon</h2>

      <button onClick={handleStart} disabled={loading}>
        {session ? "Nueva partida" : "Empezar partida"}
      </button>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {session && (
        <div>
          {/* Pistas */}
          <p>
            Tipo: {session.pokemon.type1}
            {session.pokemon.type2 ? ` / ${session.pokemon.type2}` : ""}
          </p>
          <p>Generación: {session.pokemon.generation}</p>

          {/* Palabra enmascarada */}
          <p style={{ fontSize: "2rem", letterSpacing: "0.5rem" }}>
            {session.maskedWord.split("").join(" ")}
          </p>

          {/* Intentos restantes */}
          <p>Intentos fallados: {session.intentos} / 6</p>

          {/* Letras ya usadas */}
          <p>
            Letras usadas:{" "}
            {session.guessedLetters.length > 0
              ? [...session.guessedLetters].join(", ")
              : "ninguna"}
          </p>

          {/* Estado final */}
          {session.gameOver && session.ganado && (
            <p style={{ color: "green" }}>
              ¡Correcto! El Pokémon era {session.pokemon.name}.
            </p>
          )}
          {session.gameOver && !session.ganado && (
            <p style={{ color: "red" }}>
              ¡Has perdido! El Pokémon era {session.pokemon.name}.
            </p>
          )}

          {/* Input de letra — solo visible si la partida sigue */}
          {!session.gameOver && (
            <div>
              <input
                type="text"
                maxLength={1}
                value={letra}
                placeholder="Introduce una letra"
                onChange={(e) => setLetra(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button onClick={handleGuess} disabled={loading || !letra}>
                Adivinar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GuessPokemon;
