package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

import styles from "./GuessPokemon.module.css";

import { useEffect, useRef, useState } from "react";
import { startGame, guessLetter, abandonGame, forceLoseGame } from "../services/api";

const MAX_INTENTOS = 7;

function GuessPokemon({ user, onGameStart, onGameEnd, autoStart = false }) {
  const [session, setSession] = useState(null);
  const [letra, setLetra] = useState("");
  const [palabra, setPalabra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (session && !session.gameOver && !loading) {
      inputRef.current?.focus();
    }
  }, [session, loading]);

  useEffect(() => {
    const penalizeOnClose = () => {
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        navigator.sendBeacon(
          `http://localhost:8080/game/abandon?userId=${user.id}`,
        );
      }
    };

    window.addEventListener("beforeunload", penalizeOnClose);
    return () => window.removeEventListener("beforeunload", penalizeOnClose);
  }, [user?.id]);

  useEffect(() => {
    return () => {
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        abandonGame(user.id).catch(() => {});
      }
    };
  }, [user?.id]);

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
      setPalabra("");
      onGameStart();
    } catch (err) {
      setError(err?.message || "Error al iniciar la partida.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoStart && !session && user?.id) {
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, user?.id]);

  const handleGuess = async () => {
    if (!letra || letra.length !== 1) return;
    setLoading(true);
    setError(null);
    try {
      const data = await guessLetter(user.id, letra);
      setSession(data);
      setLetra("");
      if (data.gameOver) onGameEnd();
    } catch (err) {
      setError(err?.message || "Error al enviar la letra.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuessWord = async () => {
    if (!palabra || !session || session.gameOver) return;
    const objetivo = (session.pokemon?.name || "").toLowerCase();
    const intento = palabra.trim().toLowerCase();

    setLoading(true);
    setError(null);
    try {
      if (intento === objetivo) {
        const letrasPendientes = [...new Set(objetivo.replace(/[^a-z]/g, "").split(""))]
          .filter((l) => !session.guessedLetters?.includes(l));
        let updated = session;
        for (const l of letrasPendientes) {
          updated = await guessLetter(user.id, l);
          if (updated.gameOver) break;
        }
        setSession(updated);
        if (updated.gameOver) onGameEnd();
      } else {
        const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
        const wrongLetter = alphabet.find(
          (c) => !objetivo.includes(c) && !session.guessedLetters?.includes(c),
        );
        if (wrongLetter) {
          const data = await guessLetter(user.id, wrongLetter);
          setSession(data);
          if (data.gameOver) onGameEnd();
        }
      }
      setPalabra("");
    } catch (err) {
      setError(err?.message || "Error al enviar la palabra.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceLose = async () => {
    if (!session || session.gameOver || !user?.id) return;
    const data = await forceLoseGame(user.id);
    setSession(data);
    if (data.gameOver) onGameEnd();
  };

  useEffect(() => {
    const onForceLose = () => {
      handleForceLose().catch(() => {});
    };
    window.addEventListener("forceLoseGuessPokemon", onForceLose);
    return () => window.removeEventListener("forceLoseGuessPokemon", onForceLose);
  }, [session, user?.id]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleGuess();
  };

  const puntosActuales =
    session && !session.gameOver
      ? ([100, 70, 60, 50, 40, 30, 20, 10][session.intentos] ?? 10)
      : null;

  const intentos = session?.intentos ?? 0;
  const mostrarTipo1 = session?.mostrarTipo1 ?? intentos >= 2;
  const mostrarGeneracion = session?.mostrarGeneracion ?? intentos >= 4;
  const mostrarTipo2 = session?.mostrarTipo2 ?? intentos >= 6;

  const scoreGanado = (() => {
    if (!session?.gameOver) return null;
    if (Number.isFinite(session.puntosGanados)) return session.puntosGanados;
    if (session.ganado) return [100, 70, 60, 50, 40, 30, 20, 10][intentos] ?? 10;
    return -25;
  })();

  if (!session) {
    return (
      <div className={styles.startScreen}>
        <p className={styles.startTitle}>ADIVINA EL POKÉMON</p>
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.btnStart} onClick={handleStart} disabled={loading}>
          {loading ? "CARGANDO..." : "EMPEZAR PARTIDA"}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={`${styles.panel} ${styles.wordPanel}`}>
          <p className={styles.panelLabel}>PALABRA</p>
          <p className={styles.maskedWord}>{session.maskedWord.split("").join(" ")}</p>

          <div className={styles.livesBar}>
            {Array.from({ length: MAX_INTENTOS }, (_, i) => (
              <span key={i} className={`${styles.lifeIcon} ${i < intentos ? styles.used : ""}`}>
                {i < intentos ? "💀" : "❤️"}
              </span>
            ))}
          </div>

          {puntosActuales !== null && (
            <p className={styles.ptsPreview}>+{puntosActuales} PTS SI ADIVINAS</p>
          )}
        </div>

        <div className={`${styles.panel} ${styles.hintsPanel}`}>
          <p className={styles.panelLabel}>PISTAS</p>

          <div className={styles.hintList}>
            <div className={styles.hintRow}>
              <span className={styles.hintKey}>Tipo 1:</span>
              {mostrarTipo1 ? (
                <span className={`${styles.typeBadge} ${styles[`type${session.pokemon.type1}`] || ""}`}>
                  {session.pokemon.type1}
                </span>
              ) : (
                <span className={styles.hintLocked}>??? (2 fallos)</span>
              )}
            </div>
            <div className={styles.hintRow}>
              <span className={styles.hintKey}>Generación:</span>
              {mostrarGeneracion ? (
                <span className={styles.hintVal}>GEN {session.pokemon.generation}</span>
              ) : (
                <span className={styles.hintLocked}>??? (4 fallos)</span>
              )}
            </div>
            <div className={styles.hintRow}>
              <span className={styles.hintKey}>Tipo 2:</span>
              {mostrarTipo2 ? (
                <span className={`${styles.typeBadge} ${styles[`type${session.pokemon.type2}`] || ""}`}>
                  {session.pokemon.type2 || "ninguno"}
                </span>
              ) : (
                <span className={styles.hintLocked}>??? (6 fallos)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {session.gameOver && session.ganado && (
        <div className={styles.resultWin}>
          ¡CORRECTO! ERA {session.pokemon.name.toUpperCase()}
          {scoreGanado !== null && (
            <>
              <br />
              {scoreGanado === 100 ? `¡GOLPE CRÍTICO! +${scoreGanado} PTS` : `+${scoreGanado} PTS`}
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

      <div className={`${styles.panel} ${styles.bottomPanel}`}>
        <p className={styles.panelLabel}>ADIVINAR</p>

        {!session.gameOver ? (
          <>
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
                {loading ? "..." : "ADIVINAR LETRA"}
              </button>
            </div>

            <div className={styles.inputRow}>
              <input
                className={styles.wordInput}
                type="text"
                value={palabra}
                onChange={(e) => setPalabra(e.target.value)}
                disabled={loading}
                placeholder="Adivinar palabra completa"
              />
              <button
                className={styles.btnGuess}
                onClick={handleGuessWord}
                disabled={loading || !palabra.trim()}
              >
                {loading ? "..." : "ADIVINAR PALABRA"}
              </button>
            </div>
          </>
        ) : (
          <button className={styles.btnStart} onClick={handleStart} disabled={loading}>
            {loading ? "CARGANDO..." : "NUEVA PARTIDA"}
          </button>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.usedLetters}>
          <span className={styles.usedLabel}>USADAS:</span>
          {session.guessedLetters && session.guessedLetters.length > 0 ? (
            [...session.guessedLetters].map((l) => (
              <span key={l} className={styles.letterChip}>
                {l}
              </span>
            ))
          ) : (
            <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuessPokemon;