import { useState } from "react";
import { startGame, guessLetter } from "../services/api";

function GuessPokemon({ user }) {
  const [session, setSession] = useState(null);
  const [letra, setLetra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    if (!user?.id) {
      setError("No hay usuario activo. Vuelve a iniciar sesión.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await startGame(user.id);
      setSession(data);
      setLetra("");
    } catch (err) {
      setError(err?.message || "Error al iniciar la partida.");
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
      setError(err?.message || "Error al enviar la letra.");
    } finally {
      setLoading(false);
    }
  };

  // Permite enviar con Enter además del botón
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleGuess();
  };

  // Cuántos puntos obtendría si adivinara ahora
  const puntosActuales =
    session && !session.gameOver
      ? ([100, 70, 60, 50, 40, 30, 20, 10][session.intentos] ?? 10)
      : null;

  // Fallback por intentos para no depender solo de flags del backend
  const intentos = session?.intentos ?? 0;
  const mostrarTipo1 = session?.mostrarTipo1 ?? intentos >= 2;
  const mostrarGeneracion = session?.mostrarGeneracion ?? intentos >= 4;
  const mostrarTipo2 = session?.mostrarTipo2 ?? intentos >= 6;

  const scoreGanado = (() => {
    if (!session?.gameOver) return null;
    if (Number.isFinite(session.puntosGanados)) return session.puntosGanados;
    if (session.ganado)
      return [100, 70, 60, 50, 40, 30, 20, 10][intentos] ?? 10;
    return -25;
  })();

  return (
    <div>
      <h2 className="titulo1">Adivina el Pokémon</h2>

      <button onClick={handleStart} disabled={loading}>
        {session ? "Nueva partida" : "Empezar partida"}
      </button>

      {loading && <p className="titulo2">Cargando...</p>}
      {error && <p className="titulo2" style={{ color: "red" }}>{error}</p>}

      {session && (
        <div>
          {/* Pistas progresivas */}
          <div>
            <h3>Pistas</h3>
            {mostrarTipo1 ? (
              <p>Tipo 1: {session.pokemon.type1}</p>
            ) : (
              <p style={{ color: "gray" }}>Tipo 1: se revela en el fallo 2</p>
            )}

            {mostrarGeneracion ? (
              <p>Generación: {session.pokemon.generation}</p>
            ) : (
              <p style={{ color: "gray" }}>
                Generación: se revela en el fallo 4
              </p>
            )}

            {mostrarTipo2 ? (
              <p>
                Tipo 2:{" "}
                {session.pokemon.type2
                  ? session.pokemon.type2
                  : "este Pokémon no tiene tipo secundario"}
              </p>
            ) : (
              <p style={{ color: "gray" }}>Tipo 2: se revela en el fallo 6</p>
            )}
          </div>

          {/* Palabra enmascarada */}
          <p style={{ fontSize: "2rem", letterSpacing: "0.5rem" }}>
            {session.maskedWord.split("").join(" ")}
          </p>

          {/* Intentos y puntos en juego */}
          <p>Intentos fallados: {session.intentos} / 7</p>
          {puntosActuales !== null && (
            <p>
              Puntos si adivinas ahora: <strong>{puntosActuales}</strong>
            </p>
          )}

          {/* Letras ya usadas */}
          <p>
            Letras usadas:{" "}
            {session.guessedLetters && session.guessedLetters.length > 0
              ? [...session.guessedLetters].join(", ")
              : "ninguna"}
          </p>

          {/* Estado final */}
          {session.gameOver && session.ganado && (
            <div>
              <p style={{ color: "green" }}>
                ¡Correcto! El Pokémon era{" "}
                <strong>{session.pokemon.name}</strong>.
              </p>
              {scoreGanado !== null && (
                <p style={{ color: "green" }}>
                  {scoreGanado === 100
                    ? `¡Golpe crítico! +${scoreGanado} pts`
                    : `+${scoreGanado} pts`}
                </p>
              )}
            </div>
          )}

          {session.gameOver && !session.ganado && (
            <div>
              <p style={{ color: "red" }}>
                ¡Has perdido! El Pokémon era{" "}
                <strong>{session.pokemon.name}</strong>.
              </p>
              <p style={{ color: "red" }}>-25 pts</p>
            </div>
          )}

          {/* Input — solo si la partida sigue */}
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
