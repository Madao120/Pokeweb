//import "./GuessPokemon.css";

import { useEffect, useRef, useState } from "react";
import { startGame, guessLetter } from "../services/api";

function GuessPokemon({ user, onGameStart, onGameEnd }) {
  const [session, setSession] = useState(null);
  const [letra, setLetra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Si hay sesion activa y el juego no está GameOver, enfocará al input para no tener que clicar de nuevo continuamente en el
    if (session && !session.gameOver && !loading) {
      // El ? es para evitar errores si el inputRef no está asignado por alguna razón
      inputRef.current?.focus();
    }
    // Esto cada vez que cambie la sesion o se tenga que cargar, llendo siempre la input, que es realmente lo unico que se puede hacer por ahora, escribir
  }, [session, loading]);

  // Iniciar nueva partida desde el inicio.
  const handleStart = async () => {

    // Si por alguna razon se ha ido a este componente sin iniciar sesion no dejará jugar
    if (!user?.id) {
      setError("No hay usuario activo. Vuelve a iniciar sesión.");
      return;
    }

    // Pondremos un loading mientras carga la partida en caso de que tarde y por si acaso limpiaremos los errores desde 0
    setLoading(true);
    setError(null);
    try {
      // Iniciaremos startGame desde la api, con el usuario, para posteriormente asignarle los puntos
      const data = await startGame(user.id);
      setSession(data);
      setLetra("");
      onGameStart(); // avisa al NavBar que hay partida activa
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
      // Si la partida terminó, desactiva el aviso de penalización
      if (data.gameOver) {
        onGameEnd();
      }
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
    <div className="game-container">
      <h2>Adivina el Pokémon</h2>

      <button
        className="game-start-button"
        onClick={handleStart}
        disabled={loading}
      >
        {session ? "Nueva partida" : "Empezar partida"}
      </button>

      {loading && <p>Cargando...</p>}
      {error && <p className="game-error">{error}</p>}

      {session && (
        <div className="game-display">
          {/* Pistas progresivas */}
          <div>
            <h3>Pistas</h3>
            {mostrarTipo1 ? (
              <p>Tipo 1: {session.pokemon.type1}</p>
            ) : (
              <p style={{ color: "gray" }}>Tipo 1: No Disponible</p>
            )}

            {mostrarGeneracion ? (
              <p>Generación: {session.pokemon.generation}</p>
            ) : (
              <p style={{ color: "gray" }}>Generación: No Disponible</p>
            )}

            {mostrarTipo2 ? (
              <p>
                Tipo 2:{" "}
                {session.pokemon.type2
                  ? session.pokemon.type2
                  : "este Pokémon no tiene tipo secundario"}
              </p>
            ) : (
              <p style={{ color: "gray" }}>Tipo 2: No Disponible</p>
            )}
          </div>

          {/* Palabra enmascarada */}
          <p className="pokemon-hint">
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
          <div className="game-guessed-letters">
            {session.guessedLetters && session.guessedLetters.length > 0 ? (
              [...session.guessedLetters].map((letra) => (
                <span key={letra} className="game-guessed-letter">
                  {letra}
                </span>
              ))
            ) : (
              <span>Ninguna letra usada</span>
            )}
          </div>

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
            <div className="game-input-group">
              <input
                ref={inputRef}
                type="text"
                maxLength={1}
                value={letra}
                placeholder="Introduce una letra"
                onChange={(e) => setLetra(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleGuess}
                disabled={loading || !letra}
              >
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
