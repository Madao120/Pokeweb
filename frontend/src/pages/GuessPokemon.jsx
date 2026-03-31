import styles from "./GuessPokemon.module.css";

import { useEffect, useRef, useState } from "react";
import { startGame, guessLetter, abandonGame } from "../services/api";

const MAX_INTENTOS = 7;

function GuessPokemon({ user, onGameStart, onGameEnd }) {
  const [session, setSession] = useState(null);
  const [letra, setLetra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    // Si hay sesion activa y el juego no está GameOver, enfocará al input para no tener que clicar de nuevo continuamente en el
    if (session && !session.gameOver && !loading) {
      // El ? es para evitar errores si el inputRef no está asignado por alguna razón
      inputRef.current?.focus();
    }
    // Esto cada vez que cambie la sesion o se tenga que cargar, llendo siempre la input, que es realmente lo unico que se puede hacer por ahora, escribir
  }, [session, loading]);

  // En caso de no terminar la partida se penalizará
  useEffect(() => {
    const penalizeOnClose = () => {
      if (user?.id && session && !session.gameOver) {
        navigator.sendBeacon(
          `http://localhost:8080/game/abandon?userId=${user.id}`,
        );
      }
    };

    window.addEventListener("beforeunload", penalizeOnClose);
    return () => {
      window.removeEventListener("beforeunload", penalizeOnClose);
    };
  }, [session, user?.id]);

  useEffect(() => {
    return () => {
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        abandonGame(user.id).catch(() => {});
      }
    };
  }, [user?.id]);

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
        await onGameEnd?.();
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

  // Añadido por si acaso si no hay sesión activa
  if (!session) {
    return (
      <div className={styles.startScreen}>
        <p className={styles.startTitle}>ADIVINA EL POKÉMON</p>
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.btnStart}
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? "CARGANDO..." : "EMPEZAR PARTIDA"}
        </button>
      </div>
    );
  }

  // RETURN PRINCIPAL (modificado para que se parezca al nuevo diseño)
  return (
    <div className={styles.container}>
      {/*Fila Superior decorativa */}
      <div className={styles.topRow}>
        {/*Panel izquierdo: Palabra a adivinar + vidas */}
        <div className={`${styles.panel} ${styles.wordPanel}`}>
          {/*Palabra enmascarada */}
          <p className={styles.panelLabel}>PALABRA</p>
          <p className={styles.maskedWord}>
            {session.maskedWord.split("").join(" ")}
          </p>

          {/*Barra de vidas */}
          <div className={styles.livesBar}>
            {Array.from({ length: MAX_INTENTOS }, (_, i) => (
              <span
                key={i}
                className={`${styles.lifeIcon} ${i < intentos ? styles.used : ""}`}
              >
                {i < intentos ? "💀" : "❤️"}
              </span>
            ))}
          </div>

          {/*Puntos actuales*/}
          {puntosActuales !== null && (
            <p className={styles.ptsPreview}>
              +{puntosActuales} PTS SI ADIVINAS
            </p>
          )}
        </div>

        {/*Panel derecho: Pistas */}
        <div className={`${styles.panel} ${styles.hintsPanel}`}>
          <p className={styles.panelLabel}>PISTAS</p>

          {/*Lista con las pistas */}
          <div className={styles.hintList}>
            <div className={styles.hintRow}>
              <span className={styles.hintKey}>Tipo 1:</span>
              {mostrarTipo1 ? (
                <span className={styles.typeBadge}>
                  {session.pokemon.type1}
                </span>
              ) : (
                <span className={styles.hintLocked}>??? (2 fallos)</span>
              )}
            </div>
            <div className={styles.hintRow}>
              <span className={styles.hintKey}>Generación:</span>
              {mostrarGeneracion ? (
                <span className={styles.hintVal}>
                  GEN {session.pokemon.generation}
                </span>
              ) : (
                <span className={styles.hintLocked}>??? (4 fallos)</span>
              )}
            </div>
            <div className={styles.hintRow}>
              <span className={styles.hintKey}>Tipo 2:</span>
              {mostrarTipo2 ? (
                <span className={styles.typeBadge}>
                  {session.pokemon.type2 || "ninguno"}
                </span>
              ) : (
                <span className={styles.hintLocked}>??? (6 fallos)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje final; Cuando acaba la partida */}
      {session.gameOver && session.ganado && (
        <div className={styles.resultWin}>
          ¡CORRECTO! ERA {session.pokemon.name.toUpperCase()}
          {scoreGanado !== null && (
            <>
              <br />
              {scoreGanado === 100
                ? `¡GOLPE CRÍTICO! +${scoreGanado} PTS`
                : `+${scoreGanado} PTS`}
            </>
          )}
        </div>
      )}
      {session.gameOver && !session.ganado && (
        <div className={styles.resultLose}>
          DERROTA — ERA {session.pokemon.name.toUpperCase()}
          <br />
          -25 PTS
        </div>
      )}

      {/*Panel inferior: Input para adivinar letra + letras usadas + nueva Partida*/}
      <div className={`${styles.panel} ${styles.bottomPanel}`}>
        <p className={styles.panelLabel}>ADIVINAR</p>

        {!session.gameOver ? (
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.letterInput}
              type="text"
              maxLength={1}
              value={letra}
              onChange={(e) => setLetra(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="_"
            />
            <button
              className={styles.btnGuess}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleGuess}
              disabled={loading || !letra}
            >
              {loading ? "..." : "ADIVINAR"}
            </button>
          </div>
        ) : (
          <button
            className={styles.btnStart}
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? "CARGANDO..." : "NUEVA PARTIDA"}
          </button>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {loading && !session.gameOver && (
          <p className={styles.loading}>CARGANDO...</p>
        )}

        {/*Letras usadas */}
        <div className={styles.usedLetters}>
          <span className={styles.usedLabel}>USADAS:</span>
          {session.guessedLetters && session.guessedLetters.length > 0 ? (
            [...session.guessedLetters].map((l) => (
              <span key={l} className={styles.letterChip}>
                {l}
              </span>
            ))
          ) : (
            <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
              —
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuessPokemon;
