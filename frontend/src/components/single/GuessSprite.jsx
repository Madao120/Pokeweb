import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./GuessSprite.module.css";
import {
  abandonGuessSpriteGame,
  forceLoseGuessSpriteGame,
  getGuessSpritePokemonList,
  getRankingM3,
  guessSpritePokemon,
  startGuessSpriteGame,
} from "../../services/api";

const EXIT_DELAY_MS = 520;
const POINTS_BY_FALLOS = [100, 80, 60, 40, 20, 10];

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

function GuessSprite({
  user,
  onGameStart,
  onGameEnd,
  onChangeMinigame,
  autoStart = false,
}) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [pokemonOptions, setPokemonOptions] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [panelsVisible, setPanelsVisible] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [feedback, setFeedback] = useState("");

  const sessionRef = useRef(null);
  const dropdownRef = useRef(null);

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
    getRankingM3(user?.id)
      .then(setRanking)
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!session?.gameOver) return;
    getRankingM3(user?.id)
      .then(setRanking)
      .catch(() => {});
  }, [session?.gameOver, user?.id]);

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
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const penalizeOnClose = () => {
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        navigator.sendBeacon(
          `http://localhost:8080/game/m3/abandon?userId=${user.id}`,
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
        abandonGuessSpriteGame(user.id).catch(() => {});
      }
    };
  }, [user?.id]);

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
        const [nextSession, options] = await Promise.all([
          startGuessSpriteGame(user.id),
          pokemonOptions.length === 0
            ? getGuessSpritePokemonList()
            : Promise.resolve(pokemonOptions),
        ]);
        setSession(nextSession);
        setPokemonOptions(options);
        onGameStart();
        animatePanelsIn();
      } catch (err) {
        setError(err?.message || "Error al iniciar GuessSprite.");
      } finally {
        setLoading(false);
      }
    },
    [animatePanelsIn, onGameStart, pokemonOptions, user?.id],
  );

  useEffect(() => {
    if (autoStart && !session && user?.id) {
      handleStart();
    }
  }, [autoStart, handleStart, session, user?.id]);

  const filteredOptions = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return pokemonOptions.slice(0, 12);
    return pokemonOptions
      .filter((pokemon) => normalizeSearch(pokemon.name).includes(needle))
      .slice(0, 12);
  }, [pokemonOptions, query]);

  const handlePickOption = (option) => {
    setSelectedOption(option);
    setQuery(option.name);
    setDropdownOpen(false);
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
      const data = await guessSpritePokemon(user.id, optionToSend.id);
      setSession(data);
      setSelectedOption(null);
      setQuery("");
      setDropdownOpen(false);

      if (data.gameOver) {
        setFeedback(
          data.ganado
            ? "Correcto, era ese Pokemon."
            : `Derrota. Era ${data.pokemon?.name?.toUpperCase() || "?"}.`,
        );
        onGameEnd();
      } else {
        setFeedback("No era. Se amplia el sprite para el siguiente intento.");
      }
    } catch (err) {
      setError(err?.message || "Error al responder la ronda.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceLose = useCallback(async () => {
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
  }, [onGameEnd, session, user?.id]);

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
    if (autoStart || loading) {
      return (
        <div className={styles.startScreen}>
          <p className={styles.startTitle}>GUESS SPRITE</p>
          <p className={styles.startTitle}>PREPARANDO PARTIDA...</p>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      );
    }

    return (
      <div className={styles.startScreen}>
        <p className={styles.startTitle}>GUESS SPRITE</p>
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

  const fallos = session.fallos ?? 0;
  const maxFallos = session.maxFallos ?? 5;
  const puntosPreview =
    fallos <= maxFallos ? (POINTS_BY_FALLOS[fallos] ?? 10) : null;
  const scoreGanado = session.puntosGanados;

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={styles.mainColumn}>
          <div
            className={`${styles.panel} ${styles.imagePanel} ${panelsVisible ? styles.imagePanelVisible : ""}`}
          >
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>GUESS SPRITE</p>
              <p className={styles.roundLabel}>
                FALLOS {Math.min(fallos, maxFallos)}/{maxFallos}
              </p>
            </div>

            <div className={styles.spriteViewport}>
              {session?.pokemon?.spriteUrl ? (
                <img
                  src={session.pokemon.spriteUrl}
                  alt={session.gameOver ? session.pokemon.name : "Sprite oculto"}
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

            {!session.gameOver && (
              <p className={styles.pointsHint}>SI ACIERTAS AHORA: +{puntosPreview} PTS</p>
            )}
          </div>

          <div
            className={`${styles.panel} ${styles.searchPanel} ${panelsVisible ? styles.searchPanelVisible : ""}`}
          >
            <p className={styles.panelLabel}>BUSCADOR DE POKEMON</p>
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

            {!session.gameOver ? (
              <>
                <div className={styles.selectWrap} ref={dropdownRef}>
                  <input
                    className={styles.searchInput}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedOption(null);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
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
                  {dropdownOpen && (
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
                          <span className={styles.optionName}>{pokemon.name}</span>
                        </button>
                      ))}
                      {filteredOptions.length === 0 && (
                        <p className={styles.noResults}>Sin resultados</p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  className={`${styles.btnStart} ${styles.btnGuess}`}
                  onClick={handleGuess}
                  disabled={loading}
                >
                  {loading ? "..." : "ADIVINAR"}
                </button>
              </>
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
                  <span className={styles.rankingScore}>{player.scoreM3}</span>
                </div>
              );
            })}
            {ranking.length === 0 && (
              <p className={styles.rankingEmpty}>Sin datos aun</p>
            )}
          </div>
        </div>
      </div>

      {session.gameOver && (
        <div
          className={`${scoreGanado >= 0 ? styles.resultWin : styles.resultLose} ${resultVisible ? styles.resultVisible : ""}`}
        >
          {scoreGanado >= 0
            ? `CORRECTO! ERA ${session.pokemon?.name?.toUpperCase() || "?"}`
            : `DERROTA - ERA ${session.pokemon?.name?.toUpperCase() || "?"}`}
          <br />
          {scoreGanado >= 0 ? `+${scoreGanado} PTS` : `${scoreGanado} PTS`}
        </div>
      )}
    </div>
  );
}

export default GuessSprite;
