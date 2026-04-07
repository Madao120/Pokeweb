import styles from "./HangmanGame.module.css";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startGame,
  guessLetter,
  guessWord,
  abandonGame,
  forceLoseGame,
  getRanking,
} from "../../services/api";

const MAX_INTENTOS = 7;

function isLetterCharacter(value) {
  return /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ]$/.test(value);
}

function isControlKey(key) {
  return [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "Tab",
    "Enter",
  ].includes(key);
}

function sanitizeWordInput(value) {
  return Array.from(value)
    .filter((char) => isLetterCharacter(char))
    .join("");
}

function HangmanGame({
  user,
  onGameStart,
  onGameEnd,
  onChangeMinigame,
  autoStart = false,
}) {
  const [session, setSession] = useState(null);
  const [letra, setLetra] = useState("");
  const [palabra, setPalabra] = useState("");
  const [wordInputError, setWordInputError] = useState(false);
  const [spriteUrl, setSpriteUrl] = useState(null);
  const [revealPhase, setRevealPhase] = useState("ball");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ranking, setRanking] = useState([]);
  const inputRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    getRanking(user?.id)
      .then(setRanking)
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (session?.gameOver) {
      getRanking(user?.id)
        .then(setRanking)
        .catch(() => {});
    }
  }, [session?.gameOver, user?.id]);

  useEffect(() => {
    const loadSprite = async () => {
      if (!session?.gameOver || !session?.pokemon?.name) return;
      try {
        const r = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${session.pokemon.name.toLowerCase()}`,
        );
        if (!r.ok) return;
        const data = await r.json();
        setSpriteUrl(
          data?.sprites?.other?.["official-artwork"]?.front_default ||
            data?.sprites?.front_default ||
            null,
        );
      } catch {
        setSpriteUrl(null);
      }
    };
    loadSprite();
  }, [session, session?.gameOver, session?.pokemon?.name]);

  useEffect(() => {
    if (!session) {
      setRevealPhase("ball");
      return undefined;
    }

    if (!session.gameOver) {
      setRevealPhase("ball");
      return undefined;
    }

    setRevealPhase("white");
    const timer = window.setTimeout(() => {
      setRevealPhase("pokemon");
    }, 420);

    return () => window.clearTimeout(timer);
  }, [session, session?.gameOver, session?.pokemon?.name]);

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
      setWordInputError(false);
      setSpriteUrl(null);
      setRevealPhase("ball");
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
    if (!session || session.gameOver) return;
    const intento = palabra.trim().toLowerCase();

    if (!intento) {
      setWordInputError(true);
      return;
    }

    setLoading(true);
    setWordInputError(false);
    setError(null);
    try {
      const data = await guessWord(user.id, intento);
      setSession(data);
      if (data.gameOver) onGameEnd();
      setPalabra("");
      setWordInputError(false);
    } catch (err) {
      setError(err?.message || "Error al enviar la palabra.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceLose = useCallback(async () => {
    if (!session || session.gameOver || !user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await forceLoseGame(user.id);
      setSession({
        ...data,
        intentos: MAX_INTENTOS,
        gameOver: true,
        ganado: false,
      });
      setLetra("");
      setPalabra("");
      setWordInputError(false);
      if (data.gameOver) onGameEnd();
    } catch (err) {
      setError(err?.message || "Error al rendirse.");
    } finally {
      setLoading(false);
    }
  }, [onGameEnd, session, user?.id]);

  useEffect(() => {
    const onForceLose = () => {
      handleForceLose().catch(() => {});
    };
    window.addEventListener("forceLoseGuessPokemon", onForceLose);
    return () =>
      window.removeEventListener("forceLoseGuessPokemon", onForceLose);
  }, [handleForceLose]);

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
    if (session.ganado) {
      return [100, 70, 60, 50, 40, 30, 20, 10][intentos] ?? 10;
    }
    return -25;
  })();

  const maskedWordLength = session?.maskedWord?.length ?? 0;
  const maskedWordClassName = [
    styles.maskedWord,
    maskedWordLength >= 20 ? styles.maskedWordVeryLong : "",
    maskedWordLength >= 15 && maskedWordLength < 20
      ? styles.maskedWordLong
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!session) {
    if (autoStart || loading) {
      return (
        <div className={styles.startScreen}>
          <p className={styles.startTitle}>ADIVINA EL POKEMON</p>
          <p className={styles.startTitle}>PREPARANDO PARTIDA...</p>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      );
    }

    return (
      <div className={styles.startScreen}>
        <p className={styles.startTitle}>ADIVINA EL POKEMON</p>
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

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={`${styles.panel} ${styles.wordPanel}`}>
          <p className={styles.panelLabel}>Pokemon a adivinar</p>
          <p className={maskedWordClassName}>
            {session.maskedWord.split("").join(" ")}
          </p>

          <div className={styles.livesBar}>
            PS&nbsp;
            {Array.from({ length: MAX_INTENTOS }, (_, i) => {
              const remaining = MAX_INTENTOS - intentos;
              let colorClass = styles.lifeGreen;
              if (remaining <= 2) colorClass = styles.lifeRed;
              else if (remaining <= 4) colorClass = styles.lifeYellow;
              const isUsed = i < intentos;
              return (
                <span
                  key={i}
                  className={`${styles.lifeBlock} ${isUsed ? styles.lifeUsed : colorClass}`}
                />
              );
            })}
          </div>

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
                -
              </span>
            )}
          </div>

          {puntosActuales !== null && (
            <p className={styles.ptsPreview}>
              +{puntosActuales} PTS SI ADIVINAS
            </p>
          )}

          <div className={styles.pokeInfo}>
            <div
              className={`${styles.spriteReveal} ${revealPhase === "white" ? styles.spriteRevealWhite : ""} ${revealPhase === "pokemon" ? styles.spriteRevealPokemon : ""}`}
            >
              <img
                src="/ball1.png"
                alt="Poke Ball"
                className={styles.ballImg}
              />

              <div className={styles.spriteWhiteLayer} />

              <div className={styles.spriteRevealInner}>
                {spriteUrl ? (
                  <img
                    src={spriteUrl}
                    alt={session.gameOver ? session.pokemon.name : "Poke Ball"}
                    className={styles.spriteImg}
                  />
                ) : (
                  <span className={styles.spriteFallback}>SPRITE</span>
                )}
              </div>
            </div>

            <div className={`${styles.panel} ${styles.hintsPanel}`}>
              <div className={styles.hintList}>
                <div className={styles.hintRow}>
                  <span className={styles.hintKey}>Tipo 1:</span>
                  <br />
                  {mostrarTipo1 ? (
                    <span
                      className={`${styles.typeBadge} ${styles[`type${session.pokemon.type1}`] || ""}`}
                    >
                      {session.pokemon.type1}
                    </span>
                  ) : (
                    <span className={styles.hintLocked}>??? (2 fallos)</span>
                  )}
                </div>
                <div className={styles.hintRow}>
                  <span className={styles.hintKey}>Generacion:</span>
                  <br />
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
                  <br />
                  {mostrarTipo2 ? (
                    <span
                      className={`${styles.typeBadge} ${styles[`type${session.pokemon.type2}`] || ""}`}
                    >
                      {session.pokemon.type2 || "ninguno"}
                    </span>
                  ) : (
                    <span className={styles.hintLocked}>??? (6 fallos)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.rankingPanel}`}>
          <p className={styles.panelLabel}>TOP GAME</p>
          <div className={styles.rankingList}>
            {ranking.map((player, i) => {
              const isCurrentUser = player.id === user?.id;

              return (
                <div
                  key={player.id}
                  className={`${styles.rankingRow} ${isCurrentUser ? styles.rankingRowCurrentUser : ""}`}
                >
                  <span className={styles.rankingPos}>#{player.rank ?? i + 1}</span>
                  {player.profilePictureUrl ? (
                    <img
                      src={player.profilePictureUrl}
                      alt={player.name}
                      className={styles.rankingAvatar}
                    />
                  ) : (
                    <div className={styles.rankingAvatarFallback}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={styles.rankingName}>{player.name}</span>
                  <span className={styles.rankingScore}>{player.scoreM1}</span>
                </div>
              );
            })}
            {ranking.length === 0 && (
              <p className={styles.rankingEmpty}>Sin datos aun</p>
            )}
          </div>
        </div>
      </div>

      {session.gameOver && session.ganado && (
        <div className={styles.resultWin}>
          CORRECTO! ERA {session.pokemon.name.toUpperCase()}
          {scoreGanado !== null && (
            <>
              <br />
              {scoreGanado === 100
                ? `GOLPE CRITICO! +${scoreGanado} PTS`
                : `+${scoreGanado} PTS`}
            </>
          )}
        </div>
      )}
      {session.gameOver && !session.ganado && (
        <div className={styles.resultLose}>
          DERROTA - ERA {session.pokemon.name.toUpperCase()}
          <br />
          -25 PTS
        </div>
      )}

      <div className={`${styles.panel} ${styles.bottomPanel}`}>
        <p className={styles.panelLabel}>ADIVINAR</p>

        {!session.gameOver ? (
          <div className={styles.guessActions}>
            <div
              className={`${styles.inputRow} ${styles.inputRowLetter}`}
              onClick={() => {
                if (!loading && letra) handleGuess();
              }}
            >
              <input
                ref={inputRef}
                className={styles.letterInput}
                type="text"
                maxLength={1}
                value={letra}
                onChange={(e) => {
                  const onlyLetter = sanitizeWordInput(e.target.value).slice(
                    0,
                    1,
                  );
                  setLetra(onlyLetter.toUpperCase());
                }}
                onBeforeInput={(e) => {
                  if (
                    e.data &&
                    Array.from(e.data).some((char) => !isLetterCharacter(char))
                  ) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData("text");
                  const onlyLetter = sanitizeWordInput(pastedText).slice(0, 1);
                  setLetra(onlyLetter.toUpperCase());
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleGuess();
                    return;
                  }

                  if (
                    e.ctrlKey ||
                    e.metaKey ||
                    e.altKey ||
                    isControlKey(e.key)
                  ) {
                    return;
                  }

                  if (e.key.length === 1 && !isLetterCharacter(e.key)) {
                    e.preventDefault();
                  }
                }}
                disabled={loading}
                placeholder="_"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                pattern="[A-Za-zÁÉÍÓÚáéíóúÜüÑñ]"
              />
              <button
                className={`${styles.btnGuess} ${styles.btnGuessLetter}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleGuess}
                disabled={loading || !letra}
              >
                {loading ? "..." : "ADIVINAR LETRA"}
              </button>
            </div>

            <div
              className={`${styles.inputRow} ${styles.inputRowWord}`}
              onClick={() => {
                if (!loading) handleGuessWord();
              }}
            >
              <input
                className={`${styles.wordInput} ${wordInputError ? styles.wordInputError : ""}`}
                type="text"
                value={palabra}
                onChange={(e) => {
                  setPalabra(e.target.value);
                  if (e.target.value.trim()) setWordInputError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGuessWord();
                }}
                disabled={loading}
                placeholder="Palabra completa"
                aria-invalid={wordInputError}
              />
              <button
                className={styles.btnGuess}
                type="button"
                onClick={handleGuessWord}
                disabled={loading}
              >
                {loading ? "..." : "ADIVINAR PALABRA"}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.botonesFin}>
            <button
              className={`${styles.btnStart} ${styles.btnFinishRed}`}
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? "CARGANDO..." : "NUEVA PARTIDA"}
            </button>
            <button
              className={`${styles.btnStart} ${styles.btnFinishYellow}`}
              onClick={onChangeMinigame}
              disabled={loading}
            >
              CAMBIAR MINIJUEGO
            </button>
            <button
              className={`${styles.btnStart} ${styles.btnFinishBlue}`}
              onClick={() =>
                window.dispatchEvent(new CustomEvent("returnToModeMenu"))
              }
              disabled={loading}
            >
              CAMBIAR MODO
            </button>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

export default HangmanGame;
