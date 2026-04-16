import styles from "./GuessName.module.css";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startGame,
  guessLetter,
  guessWord,
  abandonGame,
  buildApiUrl,
  forceLoseGame,
  getRanking,
  startDailyHangman,
  guessDailyHangmanLetter,
  guessDailyHangmanWord,
} from "../../services/api";

const MAX_INTENTOS = 7;
const EXIT_DELAY_MS = 520;

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

function buildDailySolvedHangmanSession(baseSession, dailyInfo) {
  const solvedName =
    baseSession?.pokemon?.name ||
    dailyInfo?.todayPokemonName ||
    baseSession?.maskedWord ||
    "";
  const normalizedSolvedName = String(solvedName).toLowerCase();

  return {
    ...(baseSession || {}),
    pokemon: {
      ...(baseSession?.pokemon || {}),
      name: solvedName,
    },
    maskedWord: normalizedSolvedName,
    gameOver: true,
    ganado: true,
    mostrarTipo1: true,
    mostrarGeneracion: true,
    mostrarTipo2: true,
    guessedLetters: baseSession?.guessedLetters || [],
    intentos:
      baseSession?.intentos ??
      (Number.isFinite(dailyInfo?.attemptsToday) ? dailyInfo.attemptsToday : 0),
  };
}

function GuessName({
  user,
  onGameStart,
  onGameEnd,
  onChangeMinigame,
  autoStart = false,
  mode = "normal",
}) {
  const isDailyMode = mode === "daily";
  const [session, setSession] = useState(null);
  const [letra, setLetra] = useState("");
  const [palabra, setPalabra] = useState("");
  const [wordInputError, setWordInputError] = useState(false);
  const [spriteUrl, setSpriteUrl] = useState(null);
  const [revealPhase, setRevealPhase] = useState("ball");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [panelsVisible, setPanelsVisible] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [wordFailFlash, setWordFailFlash] = useState(false);
  const [wordSuccessFlash, setWordSuccessFlash] = useState(false);
  const [ballWobble, setBallWobble] = useState(false);
  const [dailyInfo, setDailyInfo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef(null);
  const wordInputRef = useRef(null);
  const sessionRef = useRef(null);
  const skipAutoAbandonRef = useRef(false);
  const revealRef = useRef(null);
  const wordFailFlashTimeoutRef = useRef(null);
  const wordSuccessFlashTimeoutRef = useRef(null);
  const ballWobbleTimeoutRef = useRef(null);

  const animatePanelsIn = useCallback(() => {
    setPanelsVisible(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setPanelsVisible(true);
      });
    });
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (isDailyMode) return;
    getRanking(user?.id)
      .then(setRanking)
      .catch(() => {});
  }, [isDailyMode, user?.id]);

  useEffect(() => {
    if (isDailyMode) return;
    if (session?.gameOver) {
      getRanking(user?.id)
        .then(setRanking)
        .catch(() => {});
    }
  }, [isDailyMode, session?.gameOver, user?.id]);

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
    if (!session?.gameOver) {
      setResultVisible(false);
      return undefined;
    }

    setResultVisible(false);
    const frameId = window.requestAnimationFrame(() => {
      setResultVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [session?.gameOver, session?.pokemon?.name]);

  useEffect(() => {
    return () => {
      if (wordFailFlashTimeoutRef.current) {
        window.clearTimeout(wordFailFlashTimeoutRef.current);
      }
      if (wordSuccessFlashTimeoutRef.current) {
        window.clearTimeout(wordSuccessFlashTimeoutRef.current);
      }
      if (ballWobbleTimeoutRef.current) {
        window.clearTimeout(ballWobbleTimeoutRef.current);
      }
    };
  }, []);

  const triggerFailFlash = useCallback(() => {
    setWordSuccessFlash(false);
    setWordFailFlash(false);
    window.requestAnimationFrame(() => {
      setWordFailFlash(true);
    });
    if (wordFailFlashTimeoutRef.current) {
      window.clearTimeout(wordFailFlashTimeoutRef.current);
    }
    wordFailFlashTimeoutRef.current = window.setTimeout(() => {
      setWordFailFlash(false);
    }, 760);
  }, []);

  const triggerSuccessFlash = useCallback(() => {
    setWordFailFlash(false);
    setWordSuccessFlash(false);
    window.requestAnimationFrame(() => {
      setWordSuccessFlash(true);
      setBallWobble(true);
    });
    if (wordSuccessFlashTimeoutRef.current) {
      window.clearTimeout(wordSuccessFlashTimeoutRef.current);
    }
    wordSuccessFlashTimeoutRef.current = window.setTimeout(() => {
      setWordSuccessFlash(false);
    }, 620);
    if (ballWobbleTimeoutRef.current) {
      window.clearTimeout(ballWobbleTimeoutRef.current);
    }
    ballWobbleTimeoutRef.current = window.setTimeout(() => {
      setBallWobble(false);
    }, 600);
  }, []);

  useEffect(() => {
    if (!isDailyMode) return undefined;
    const timer = window.setInterval(() => {
      setDailyInfo((prev) =>
        prev
          ? {
              ...prev,
              millisUntilNextReset: Math.max(
                0,
                (prev.millisUntilNextReset || 0) - 1000,
              ),
            }
          : prev,
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isDailyMode]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1200px)");
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile || !session?.ganado) return;
    revealRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isMobile, session?.ganado]);

  useEffect(() => {
    if (isDailyMode) return undefined;
    const penalizeOnClose = () => {
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        navigator.sendBeacon(buildApiUrl(`/game/abandon?userId=${user.id}`));
      }
    };

    window.addEventListener("beforeunload", penalizeOnClose);
    return () => window.removeEventListener("beforeunload", penalizeOnClose);
  }, [isDailyMode, user?.id]);

  useEffect(() => {
    if (isDailyMode) return undefined;
    return () => {
      if (skipAutoAbandonRef.current) return;
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        abandonGame(user.id).catch(() => {});
      }
    };
  }, [isDailyMode, user?.id]);

  const syncExitState = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (
      !isDailyMode &&
      user?.id &&
      currentSession &&
      !currentSession.gameOver
    ) {
      skipAutoAbandonRef.current = true;
      try {
        await abandonGame(user.id);
      } catch {}
    }
    await onGameEnd?.();
  }, [isDailyMode, onGameEnd, user?.id]);

  const handleStart = useCallback(
    async (withExit = false) => {
      if (!user?.id) {
        setError("No hay usuario activo. Vuelve a iniciar sesión.");
        return;
      }

      if (withExit && sessionRef.current) {
        if (sessionRef.current.gameOver) {
          setResultVisible(false);
          await new Promise((resolve) => window.setTimeout(resolve, 240));
        }
        setPanelsVisible(false);
        await new Promise((resolve) =>
          window.setTimeout(resolve, EXIT_DELAY_MS),
        );
      }

      setLoading(true);
      setError(null);
      try {
        const data = isDailyMode
          ? await startDailyHangman(user.id)
          : await startGame(user.id);

        if (isDailyMode) {
          setSession(
            data?.session ??
              (data?.completedToday
                ? buildDailySolvedHangmanSession(sessionRef.current, data)
                : null),
          );
          setRanking(data?.ranking ?? []);
          setDailyInfo({
            completedToday: Boolean(data?.completedToday),
            attemptsToday: data?.attemptsToday ?? null,
            todayPokemonName: data?.todayPokemonName ?? null,
            yesterdayPokemonName: data?.yesterdayPokemonName ?? null,
            millisUntilNextReset: data?.millisUntilNextReset ?? 0,
          });
        } else {
          setSession(data);
        }

        setLetra("");
        setPalabra("");
        setWordInputError(false);
        setWordFailFlash(false);
        setWordSuccessFlash(false);
        setBallWobble(false);
        setSpriteUrl(null);
        setRevealPhase("ball");
        if (data?.session || !isDailyMode) {
          onGameStart?.();
        }
        animatePanelsIn();
      } catch (err) {
        setError(err?.message || "Error al iniciar la partida.");
      } finally {
        setLoading(false);
      }
    },
    [animatePanelsIn, isDailyMode, onGameStart, user?.id],
  );

  useEffect(() => {
    if (autoStart && !session && user?.id) {
      handleStart();
    }
  }, [autoStart, handleStart, session, user?.id]);

  const handleGuess = async () => {
    if (loading) return;
    if (!letra || letra.length !== 1) return;
    setLoading(true);
    setError(null);
    try {
      const intentosAntes = session?.intentos ?? 0;
      const maskedAntes = session?.maskedWord ?? "";
      const data = isDailyMode
        ? await guessDailyHangmanLetter(user.id, letra)
        : await guessLetter(user.id, letra);
      const nextSession =
        isDailyMode && data?.completedToday && !data?.session
          ? buildDailySolvedHangmanSession(session, data)
          : isDailyMode
            ? (data?.session ?? null)
            : data;
      const falloLetra =
        (nextSession?.intentos ?? intentosAntes) > intentosAntes;
      const aciertoLetra =
        !falloLetra && (nextSession?.maskedWord ?? "") !== maskedAntes;
      setSession(nextSession);
      setLetra("");
      if (isDailyMode) {
        setRanking(data?.ranking ?? []);
        setDailyInfo({
          completedToday: Boolean(data?.completedToday),
          attemptsToday: data?.attemptsToday ?? null,
          todayPokemonName: data?.todayPokemonName ?? null,
          yesterdayPokemonName: data?.yesterdayPokemonName ?? null,
          millisUntilNextReset: data?.millisUntilNextReset ?? 0,
        });
      }
      if (falloLetra) {
        triggerFailFlash();
      } else if (aciertoLetra || nextSession?.ganado) {
        triggerSuccessFlash();
      }
      if (!isDailyMode && nextSession?.gameOver) onGameEnd?.();
      if (isDailyMode && data?.completedToday) onGameEnd?.();
    } catch (err) {
      setError(err?.message || "Error al enviar la letra.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuessWord = async () => {
    if (loading) return;
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
      const data = isDailyMode
        ? await guessDailyHangmanWord(user.id, intento)
        : await guessWord(user.id, intento);
      const nextSession =
        isDailyMode && data?.completedToday && !data?.session
          ? buildDailySolvedHangmanSession(
              { ...(session || {}), maskedWord: intento },
              data,
            )
          : isDailyMode
            ? (data?.session ?? null)
            : data;
      const falloPalabra = !(nextSession?.ganado || data?.completedToday);
      setSession(nextSession);
      if (isDailyMode) {
        setRanking(data?.ranking ?? []);
        setDailyInfo({
          completedToday: Boolean(data?.completedToday),
          attemptsToday: data?.attemptsToday ?? null,
          todayPokemonName: data?.todayPokemonName ?? null,
          yesterdayPokemonName: data?.yesterdayPokemonName ?? null,
          millisUntilNextReset: data?.millisUntilNextReset ?? 0,
        });
      }
      if (!isDailyMode && nextSession?.gameOver) onGameEnd?.();
      if (isDailyMode && data?.completedToday) onGameEnd?.();
      if (falloPalabra) {
        triggerFailFlash();
      } else {
        triggerSuccessFlash();
      }
      setPalabra("");
      setWordInputError(false);
    } catch (err) {
      setError(err?.message || "Error al enviar la palabra.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceLose = useCallback(async () => {
    if (isDailyMode) return;
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
  }, [isDailyMode, onGameEnd, session, user?.id]);

  useEffect(() => {
    const onForceLose = () => {
      handleForceLose().catch(() => {});
    };
    window.addEventListener("forceLoseGuessPokemon", onForceLose);
    return () =>
      window.removeEventListener("forceLoseGuessPokemon", onForceLose);
  }, [handleForceLose]);

  useEffect(() => {
    const onReturnToModeMenu = () => {
      setPanelsVisible(false);
    };

    window.addEventListener("returnToModeMenu", onReturnToModeMenu);
    return () =>
      window.removeEventListener("returnToModeMenu", onReturnToModeMenu);
  }, []);

  const handleChangeMinigame = useCallback(async () => {
    if (sessionRef.current?.gameOver) {
      setResultVisible(false);
      await new Promise((resolve) => window.setTimeout(resolve, 240));
    }
    await syncExitState();
    setPanelsVisible(false);
    await new Promise((resolve) => window.setTimeout(resolve, EXIT_DELAY_MS));
    onChangeMinigame?.();
  }, [onChangeMinigame, syncExitState]);

  const handleChangeMode = useCallback(async () => {
    if (sessionRef.current?.gameOver) {
      setResultVisible(false);
      await new Promise((resolve) => window.setTimeout(resolve, 240));
    }
    await syncExitState();
    setPanelsVisible(false);
    await new Promise((resolve) => window.setTimeout(resolve, EXIT_DELAY_MS));
    window.dispatchEvent(
      new CustomEvent("returnToModeMenu", {
        detail: { skipDelay: true },
      }),
    );
  }, [syncExitState]);

  const puntosActuales =
    !isDailyMode && session && !session.gameOver
      ? ([100, 70, 60, 50, 40, 30, 20, 10][session.intentos] ?? 10)
      : null;

  const intentos = session?.intentos ?? 0;
  const mostrarTipo1 = Boolean(session?.mostrarTipo1) || intentos >= 2;
  const mostrarGeneracion = Boolean(session?.mostrarGeneracion) || intentos >= 4;
  const mostrarTipo2 = Boolean(session?.mostrarTipo2) || intentos >= 6;
  const hintLabelTipo1 = isMobile ? "Tipo1" : "Tipo 1:";
  const hintLabelGeneracion = isMobile ? "Gen" : "Generacion:";
  const hintLabelTipo2 = isMobile ? "Tipo2" : "Tipo 2:";

  const scoreGanado = (() => {
    if (isDailyMode) return null;
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

  const resultBanner =
    session?.gameOver && session.ganado ? (
      <div
        className={`${styles.resultWin} ${resultVisible ? styles.resultVisible : ""}`}
      >
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
    ) : session?.gameOver ? (
      <div
        className={`${styles.resultLose} ${resultVisible ? styles.resultVisible : ""}`}
      >
        DERROTA - ERA {session.pokemon.name.toUpperCase()}
        <br />
        -25 PTS
      </div>
    ) : null;

  const rankingPanel = (
    <div
      className={`${styles.panel} ${styles.rankingPanel} ${panelsVisible ? styles.rankingPanelVisible : ""}`}
    >
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
              <span className={styles.rankingScore}>
                {isDailyMode ? `${player.attempts ?? "-"} INT` : player.scoreM1}
              </span>
            </div>
          );
        })}
        {ranking.length === 0 && (
          <p className={styles.rankingEmpty}>Sin datos aun</p>
        )}
      </div>
    </div>
  );

  if (!session) {
    if (isDailyMode && dailyInfo?.completedToday) {
      const nextInMs = Math.max(0, dailyInfo.millisUntilNextReset || 0);
      const totalSeconds = Math.floor(nextInMs / 1000);
      const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
      const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
        2,
        "0",
      );
      const ss = String(totalSeconds % 60).padStart(2, "0");
      const countdown = `${hh}:${mm}:${ss}`;

      return (
        <div className={styles.startScreen}>
          <p className={styles.startTitle}>AHORCADO DIARIO COMPLETADO</p>
          <p className={styles.startTitle}>
            HOY: {dailyInfo.todayPokemonName?.toUpperCase() || "-"}
          </p>
          <p className={styles.startTitle}>
            AYER: {dailyInfo.yesterdayPokemonName?.toUpperCase() || "-"}
          </p>
          <p className={styles.startTitle}>
            {dailyInfo.attemptsToday ?? 0} INTENTOS
          </p>
          <p className={styles.startTitle}>SIGUIENTE EN {countdown}</p>
          <div className={styles.botonesFin}>
            <button
              className={`${styles.btnStart} ${styles.btnFinishYellow}`}
              onClick={onChangeMinigame}
              disabled={loading}
            >
              SIGUIENTE RONDA
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
          {error && <p className={styles.error}>{error}</p>}
        </div>
      );
    }

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
        <p className={styles.startTitle}>
          {isDailyMode ? "AHORCADO DIARIO" : "ADIVINA EL POKEMON"}
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.btnStart}
          onClick={handleStart}
          disabled={loading}
        >
          {loading
            ? "CARGANDO..."
            : isDailyMode
              ? "EMPEZAR RONDA"
              : "EMPEZAR PARTIDA"}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div
          className={`${styles.panel} ${styles.wordPanel} ${panelsVisible ? styles.wordPanelVisible : ""}`}
        >
          <div className={styles.gameLayout}>
            <div className={styles.mainColumn}>
              <p className={styles.panelLabel}>Pokemon a adivinar</p>
              <p className={maskedWordClassName}>
                {session.maskedWord.split("").join(" ")}
              </p>

              <div className={styles.bottomRow}>
                <div className={styles.bottomLeft}>
                  {!isDailyMode && (
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
                  )}

                  <div className={styles.usedLetters}>
                    <span className={styles.usedLabel}>USADAS:</span>
                    {session.guessedLetters &&
                    session.guessedLetters.length > 0 ? (
                      [...session.guessedLetters].map((l) => (
                        <span key={l} className={styles.letterChip}>
                          {l}
                        </span>
                      ))
                    ) : (
                      <span
                        style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}
                      >
                        -
                      </span>
                    )}
                  </div>

                  {puntosActuales !== null && (
                    <p className={styles.ptsPreview}>
                      +{puntosActuales} PTS SI ADIVINAS
                    </p>
                  )}
                </div>

                <div className={styles.spriteDock}>
                  <div
                    className={`${styles.spriteReveal} ${revealPhase === "white" ? styles.spriteRevealWhite : ""} ${revealPhase === "pokemon" ? styles.spriteRevealPokemon : ""} ${wordFailFlash ? styles.spriteRevealFailFlash : ""} ${wordSuccessFlash ? styles.spriteRevealSuccessFlash : ""}`}
                  >
                    <img
                      src="/ball1.png"
                      alt="Poke Ball"
                      className={`${styles.ballImg} ${ballWobble ? styles.ballWobble : ""}`}
                    />

                    <div className={styles.spriteWhiteLayer} />

                    <div className={styles.spriteRevealInner}>
                      {spriteUrl ? (
                        <img
                          src={spriteUrl}
                          alt={
                            session.gameOver
                              ? session.pokemon.name
                              : "Poke Ball"
                          }
                          className={styles.spriteImg}
                        />
                      ) : (
                        <span className={styles.spriteFallback}>SPRITE</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.panel} ${styles.hintsPanel}`}>
              <div className={styles.hintList}>
                <div className={styles.hintRow}>
                  <span className={styles.hintKey}>{hintLabelTipo1}</span>
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
                  <span className={styles.hintKey}>{hintLabelGeneracion}</span>
                  {mostrarGeneracion ? (
                    <span className={styles.hintVal}>
                      {session.pokemon.generation}
                    </span>
                  ) : (
                    <span className={styles.hintLocked}>??? (4 fallos)</span>
                  )}
                </div>
                <div className={styles.hintRow}>
                  <span className={styles.hintKey}>{hintLabelTipo2}</span>
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
        {!isMobile && rankingPanel}
      </div>

      <div
        className={`${styles.panel} ${styles.bottomPanel} ${panelsVisible ? styles.bottomPanelVisible : ""} ${session.gameOver && resultVisible ? styles.bottomPanelShifted : ""}`}
      >
        <p className={styles.panelLabel}>ADIVINAR</p>

        {!session.gameOver ? (
          <div className={styles.guessActions}>
            <div
              className={`${styles.inputRow} ${styles.inputRowLetter}`}
              onClick={() => {
                if (!loading) inputRef.current?.focus();
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
                if (!loading) wordInputRef.current?.focus();
              }}
            >
              <input
                ref={wordInputRef}
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
        ) : isDailyMode ? (
          <div className={styles.botonesFin}>
            <button
              className={`${styles.btnStart} ${styles.btnFinishYellow}`}
              onClick={handleChangeMinigame}
              disabled={loading}
            >
              SIGUIENTE RONDA
            </button>
            <button
              className={`${styles.btnStart} ${styles.btnFinishBlue}`}
              onClick={handleChangeMode}
              disabled={loading}
            >
              CAMBIAR MODO
            </button>
          </div>
        ) : (
          <div className={styles.botonesFin}>
            <button
              className={`${styles.btnStart} ${styles.btnFinishRed}`}
              onClick={() => handleStart(true)}
              disabled={loading}
            >
              {loading ? "CARGANDO..." : "NUEVA PARTIDA"}
            </button>
            <button
              className={`${styles.btnStart} ${styles.btnFinishYellow}`}
              onClick={handleChangeMinigame}
              disabled={loading}
            >
              CAMBIAR MINIJUEGO
            </button>
            <button
              className={`${styles.btnStart} ${styles.btnFinishBlue}`}
              onClick={handleChangeMode}
              disabled={loading}
            >
              CAMBIAR MODO
            </button>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>

      {!isMobile && resultBanner}
      {isMobile && resultBanner && (
        <div className={styles.mobileResultSlot}>{resultBanner}</div>
      )}

      {isMobile && (
        <div
          ref={revealRef}
          className={`${styles.mobileSpriteDock} ${panelsVisible ? styles.mobileSpriteDockVisible : ""} ${session.gameOver ? styles.mobileSpriteDockResolved : ""}`}
        >
          <div
            className={`${styles.spriteReveal} ${revealPhase === "white" ? styles.spriteRevealWhite : ""} ${revealPhase === "pokemon" ? styles.spriteRevealPokemon : ""} ${wordFailFlash ? styles.spriteRevealFailFlash : ""} ${wordSuccessFlash ? styles.spriteRevealSuccessFlash : ""}`}
          >
            <img
              src="/ball1.png"
              alt="Poke Ball"
              className={`${styles.ballImg} ${ballWobble ? styles.ballWobble : ""}`}
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
        </div>
      )}

      {isMobile && <div className={styles.mobileRankingSlot}>{rankingPanel}</div>}
    </div>
  );
}

export default GuessName;
