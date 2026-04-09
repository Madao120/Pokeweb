import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./GuessSprite.module.css";
import {
  abandonGuessSpriteGame,
  buildApiUrl,
  forceLoseGuessSpriteGame,
  getGuessSpritePokemonList,
  getRankingM3,
  guessSpritePokemon,
  startGuessSpriteGame,
  startDailySprite,
  guessDailySprite,
} from "../../services/api";

const EXIT_DELAY_MS = 520;
const POINTS_BY_FALLOS = [100, 80, 60, 40, 20, 10];
const MAX_DROPDOWN_RESULTS = 30;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeSearch(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildDailySolvedSpriteSession(baseSession, dailyInfo, pokemonOptions) {
  const solvedName =
    baseSession?.pokemon?.name || dailyInfo?.todayPokemonName || "";
  const optionMatch = (pokemonOptions || []).find(
    (opt) => normalizeSearch(opt?.name) === normalizeSearch(solvedName),
  );

  return {
    ...(baseSession || {}),
    pokemon: {
      ...(baseSession?.pokemon || {}),
      name: solvedName,
      spriteUrl:
        optionMatch?.spriteUrl || baseSession?.pokemon?.spriteUrl || null,
    },
    gameOver: true,
    ganado: true,
    zoomActual: 1,
    focusX: baseSession?.focusX ?? 50,
    focusY: baseSession?.focusY ?? 50,
    intentos:
      baseSession?.intentos ??
      (Number.isFinite(dailyInfo?.attemptsToday) ? dailyInfo.attemptsToday : 0),
  };
}

function GuessSprite({
  user,
  onGameStart,
  onGameEnd,
  onChangeMinigame,
  autoStart = false,
  mode = "normal",
}) {
  const isDailyMode = mode === "daily";
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [pokemonOptions, setPokemonOptions] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [panelsVisible, setPanelsVisible] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [dailyInfo, setDailyInfo] = useState(null);

  const sessionRef = useRef(null);

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
    getRankingM3(user?.id)
      .then(setRanking)
      .catch(() => {});
  }, [isDailyMode, user?.id]);

  useEffect(() => {
    if (isDailyMode) return;
    if (!session?.gameOver) return;
    getRankingM3(user?.id)
      .then(setRanking)
      .catch(() => {});
  }, [isDailyMode, session?.gameOver, user?.id]);

  useEffect(() => {
    if (!session?.gameOver) {
      setResultVisible(false);
      return;
    }
    setResultVisible(false);
    const frameId = window.requestAnimationFrame(() => setResultVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [session?.gameOver, session?.puntosGanados]);

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
    if (isDailyMode) return undefined;
    const penalizeOnClose = () => {
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        navigator.sendBeacon(
          buildApiUrl(`/game/m3/abandon?userId=${user.id}`),
        );
      }
    };

    window.addEventListener("beforeunload", penalizeOnClose);
    return () => window.removeEventListener("beforeunload", penalizeOnClose);
  }, [isDailyMode, user?.id]);

  useEffect(() => {
    if (isDailyMode) return undefined;
    return () => {
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        abandonGuessSpriteGame(user.id).catch(() => {});
      }
    };
  }, [isDailyMode, user?.id]);

  const handleStart = useCallback(
    async (withExit = false) => {
      if (!user?.id) {
        setError("No hay usuario activo. Vuelve a iniciar sesion.");
        return;
      }

      if (withExit && sessionRef.current) {
        if (sessionRef.current.gameOver) {
          setResultVisible(false);
          await wait(240);
        }
        setPanelsVisible(false);
        await wait(EXIT_DELAY_MS);
      }

      setLoading(true);
      setError(null);
      setFeedback("");
      setQuery("");
      setSelectedOption(null);

      try {
        const [nextData, options] = await Promise.all([
          isDailyMode
            ? startDailySprite(user.id)
            : startGuessSpriteGame(user.id),
          pokemonOptions.length === 0
            ? getGuessSpritePokemonList()
            : Promise.resolve(pokemonOptions),
        ]);
        if (isDailyMode) {
          setSession(
            nextData?.session ??
              (nextData?.completedToday
                ? buildDailySolvedSpriteSession(
                    sessionRef.current,
                    nextData,
                    options,
                  )
                : null),
          );
          setRanking(nextData?.ranking ?? []);
          setDailyInfo({
            completedToday: Boolean(nextData?.completedToday),
            attemptsToday: nextData?.attemptsToday ?? null,
            todayPokemonName: nextData?.todayPokemonName ?? null,
            yesterdayPokemonName: nextData?.yesterdayPokemonName ?? null,
            millisUntilNextReset: nextData?.millisUntilNextReset ?? 0,
          });
        } else {
          setSession(nextData);
        }
        setPokemonOptions(options);
        if (nextData?.session || !isDailyMode) onGameStart?.();
        animatePanelsIn();
      } catch (err) {
        setError(err?.message || "Error al iniciar GuessSprite.");
      } finally {
        setLoading(false);
      }
    },
    [animatePanelsIn, isDailyMode, onGameStart, pokemonOptions, user?.id],
  );

  useEffect(() => {
    if (autoStart && !session && user?.id) {
      handleStart();
    }
  }, [autoStart, handleStart, session, user?.id]);

  const filteredOptions = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return pokemonOptions.slice(0, MAX_DROPDOWN_RESULTS);

    const startsWith = [];
    const includes = [];

    for (const pokemon of pokemonOptions) {
      const normalizedName = normalizeSearch(pokemon.name);
      if (normalizedName.startsWith(needle)) {
        startsWith.push(pokemon);
      } else if (normalizedName.includes(needle)) {
        includes.push(pokemon);
      }
    }

    return [...startsWith, ...includes].slice(0, MAX_DROPDOWN_RESULTS);
  }, [pokemonOptions, query]);

  const handlePickOption = (option) => {
    setSelectedOption(option);
    setQuery(option.name);
    setError(null);
  };

  const handleGuess = async () => {
    if (!session || session.gameOver || loading) return;

    let optionToSend = selectedOption;
    if (!optionToSend && query.trim()) {
      const normalizedQuery = normalizeSearch(query.trim());
      optionToSend =
        pokemonOptions.find(
          (pokemon) => normalizeSearch(pokemon.name) === normalizedQuery,
        ) || null;
    }

    if (!optionToSend?.id) {
      setError("Selecciona un Pokemon valido en el buscador.");
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback("");

    try {
      const data = isDailyMode
        ? await guessDailySprite(user.id, optionToSend.id)
        : await guessSpritePokemon(user.id, optionToSend.id);
      const nextSession =
        isDailyMode && data?.completedToday && !data?.session
          ? buildDailySolvedSpriteSession(session, data, pokemonOptions)
          : isDailyMode
            ? (data?.session ?? null)
            : data;
      setSession(nextSession);
      setSelectedOption(null);
      setQuery("");
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

      if (!isDailyMode && nextSession?.gameOver) {
        setFeedback(
          nextSession.ganado
            ? "Correcto, acertaste."
            : `Derrota. Era ${nextSession.pokemon?.name?.toUpperCase() || "?"}.`,
        );
        onGameEnd?.();
      } else if (!isDailyMode) {
        setFeedback(
          isDailyMode
            ? "No era. El zoom ya no bajara al llegar al minimo."
            : "No era. Se amplia el sprite para el siguiente intento.",
        );
      } else if (!data?.completedToday) {
        setFeedback("No era. El zoom ya no bajara al llegar al minimo.");
      }
      if (isDailyMode && data?.completedToday) onGameEnd?.();
    } catch (err) {
      setError(err?.message || "Error al responder la ronda.");
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
      const data = await forceLoseGuessSpriteGame(user.id);
      setSession(data);
      setFeedback(`Derrota. Era ${data.pokemon?.name?.toUpperCase() || "?"}.`);
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
      await wait(240);
    }
    setPanelsVisible(false);
    await wait(EXIT_DELAY_MS);
    onChangeMinigame?.();
  }, [onChangeMinigame]);

  const handleChangeMode = useCallback(async () => {
    if (sessionRef.current?.gameOver) {
      setResultVisible(false);
      await wait(240);
    }
    setPanelsVisible(false);
    await wait(EXIT_DELAY_MS);
    window.dispatchEvent(
      new CustomEvent("returnToModeMenu", {
        detail: { skipDelay: true },
      }),
    );
  }, []);

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
          <p className={styles.startTitle}>GUESS SPRITE DIARIO COMPLETADO</p>
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
              IR A RONDA 1
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
          <p className={styles.startTitle}>
            {isDailyMode ? "GUESS SPRITE DIARIO" : "GUESS SPRITE"}
          </p>
          <p className={styles.startTitle}>PREPARANDO PARTIDA...</p>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      );
    }

    return (
      <div className={styles.startScreen}>
        <p className={styles.startTitle}>
          {isDailyMode ? "GUESS SPRITE DIARIO" : "GUESS SPRITE"}
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

  const fallos = session.fallos ?? 0;
  const maxFallos = session.maxFallos ?? 5;
  const puntosPreview =
    fallos <= maxFallos ? (POINTS_BY_FALLOS[fallos] ?? 10) : null;
  const scoreGanado = isDailyMode
    ? session.ganado
      ? 0
      : -1
    : session.puntosGanados;

  return (
    <div
      className={`${styles.container} ${isDailyMode ? styles.containerDaily : ""}`}
    >
      <div
        className={`${styles.topRow} ${isDailyMode ? styles.topRowDaily : ""}`}
      >
        <div className={styles.leftColumn}>
          <div
            className={`${styles.panel} ${styles.searchPanel} ${panelsVisible ? styles.searchPanelVisible : ""}`}
          >
            <p className={styles.panelLabel}>GUESS SPRITE</p>
            {!isDailyMode && (
              <div className={styles.livesBar}>
                PS&nbsp;
                {Array.from({ length: 5 }, (_, i) => {
                  const remaining = Math.max(0, 5 - fallos);
                  let colorClass = styles.lifeGreen;
                  if (remaining <= 1) colorClass = styles.lifeRed;
                  else if (remaining <= 3) colorClass = styles.lifeYellow;
                  const isUsed = i < Math.min(fallos, 5);

                  return (
                    <span
                      key={i}
                      className={`${styles.lifeBlock} ${isUsed ? styles.lifeUsed : colorClass}`}
                    />
                  );
                })}
              </div>
            )}
            {!session.gameOver && (
              <p className={styles.pointsHint}>
                {isDailyMode
                  ? `INTENTOS ACTUALES: ${session.intentos ?? 0}`
                  : `SI ACIERTAS AHORA: +${puntosPreview} PTS`}
              </p>
            )}

            {!session.gameOver ? (
              <>
                <div className={styles.selectWrap}>
                  <input
                    className={styles.searchInput}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedOption(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGuess();
                      }
                    }}
                    placeholder="Escribe para buscar por nombre..."
                    autoComplete="off"
                    disabled={loading}
                  />
                  <div className={styles.dropdown}>
                    {filteredOptions.map((pokemon) => (
                      <button
                        key={pokemon.id}
                        type="button"
                        className={styles.optionRow}
                        onClick={() => handlePickOption(pokemon)}
                      >
                        <img
                          src={pokemon.spriteUrl}
                          alt={pokemon.name}
                          className={styles.optionSprite}
                        />
                        <span className={styles.optionName}>
                          {pokemon.name}
                        </span>
                      </button>
                    ))}
                    {filteredOptions.length === 0 && (
                      <p className={styles.noResults}>Sin resultados</p>
                    )}
                  </div>
                </div>

                <button
                  className={`${styles.btnStart} ${styles.btnFinishRed} ${styles.btnGuessCompact}`}
                  onClick={handleGuess}
                  disabled={loading}
                >
                  {loading ? "..." : "ADIVINAR"}
                </button>
              </>
            ) : isDailyMode ? (
              <div className={styles.botonesFin}>
                <button
                  className={`${styles.btnStart} ${styles.btnFinishYellow}`}
                  onClick={handleChangeMinigame}
                  disabled={loading}
                >
                  ADIVINASTE! SIGUIENTE RONDA
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

            {feedback && <p className={styles.feedback}>{feedback}</p>}
            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>

        <div className={styles.middleColumn}>
          <div
            className={`${styles.panel} ${styles.imagePanel} ${panelsVisible ? styles.imagePanelVisible : ""}`}
          >
            <div className={styles.spriteViewport}>
              {session?.pokemon?.spriteUrl ? (
                <img
                  src={session.pokemon.spriteUrl}
                  alt={
                    session.gameOver ? session.pokemon.name : "Sprite oculto"
                  }
                  className={`${styles.spriteImage} ${!session.gameOver ? styles.spriteImageMasked : ""}`}
                  style={{
                    transformOrigin: `${session.focusX}% ${session.focusY}%`,
                    transform: `scale(${session.zoomActual ?? 1})`,
                  }}
                />
              ) : (
                <p className={styles.spriteFallback}>SPRITE</p>
              )}
            </div>
          </div>
          {session.gameOver && (
            <div
              className={`${scoreGanado >= 0 ? styles.resultWin : styles.resultLose} ${resultVisible ? styles.resultVisible : ""}`}
            >
              {session.ganado
                ? `CORRECTO! ERA ${session.pokemon?.name?.toUpperCase() || "?"}`
                : `DERROTA - ERA ${session.pokemon?.name?.toUpperCase() || "?"}`}
              <br />
              {!isDailyMode &&
                (scoreGanado >= 0
                  ? `+${scoreGanado} PTS`
                  : `${scoreGanado} PTS`)}
            </div>
          )}
        </div>

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
                  <span className={styles.rankingPos}>
                    #{player.rank ?? i + 1}
                  </span>
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
                    {isDailyMode
                      ? `${player.attempts ?? "-"} INT`
                      : player.scoreM3}
                  </span>
                </div>
              );
            })}
            {ranking.length === 0 && (
              <p className={styles.rankingEmpty}>Sin datos aun</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuessSprite;
