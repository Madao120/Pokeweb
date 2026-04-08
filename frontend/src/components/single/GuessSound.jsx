import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./GuessSound.module.css";
import {
  abandonGuessSoundGame,
  forceLoseGuessSoundGame,
  getRankingM2,
  guessSoundPokemon,
  startGuessSoundGame,
} from "../../services/api";

const MAX_FALLOS = 4;
const EXIT_DELAY_MS = 520;
const ROUND_TRANSITION_MS = 320;
const NEXT_ROUND_UI_EXIT_MS = 260;
const TYPE_COLORS = {
  water: "#4fa5ff",
  grass: "#67c23a",
  fire: "#f16d3a",
  electric: "#f3cc3b",
  ice: "#83e4ea",
  fighting: "#c44536",
  poison: "#9e4ec5",
  ground: "#d0b27c",
  flying: "#8ea4ff",
  psychic: "#f85f87",
  bug: "#9db334",
  rock: "#b6a059",
  ghost: "#6959a5",
  dragon: "#5a66d1",
  dark: "#755848",
  steel: "#8b9eb3",
  fairy: "#e69ad6",
  normal: "#99a3ad",
};

function getOptionBackgroundStyle(type1, type2) {
  const primary = TYPE_COLORS[type1] || TYPE_COLORS.normal;
  const secondary = TYPE_COLORS[type2] || primary;

  return {
    "--option-bg":
      type2 && TYPE_COLORS[type2]
        ? `linear-gradient(135deg, ${primary}, ${secondary})`
        : primary,
  };
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function GuessSound({
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
  const [panelsVisible, setPanelsVisible] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [flashState, setFlashState] = useState("");
  const [cardsPhase, setCardsPhase] = useState("idle");
  const [pendingSession, setPendingSession] = useState(null);
  const [failedRoundInfo, setFailedRoundInfo] = useState(null);
  const [awaitingManualAdvance, setAwaitingManualAdvance] = useState(false);
  const [showNextRoundUi, setShowNextRoundUi] = useState(false);
  const [roundTransitioning, setRoundTransitioning] = useState(false);
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
    getRankingM2(user?.id)
      .then(setRanking)
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (session?.gameOver) {
      getRankingM2(user?.id)
        .then(setRanking)
        .catch(() => {});
    }
  }, [session?.gameOver, user?.id]);

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
  }, [session?.gameOver, session?.puntosGanados]);

  useEffect(() => {
    const penalizeOnClose = () => {
      const currentSession = sessionRef.current;
      if (user?.id && currentSession && !currentSession.gameOver) {
        navigator.sendBeacon(
          `http://localhost:8080/game/m2/abandon?userId=${user.id}`,
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
        abandonGuessSoundGame(user.id).catch(() => {});
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
      setFlashState("");
      setPendingSession(null);
      setFailedRoundInfo(null);
      setAwaitingManualAdvance(false);
      setShowNextRoundUi(false);
      setRoundTransitioning(false);

      try {
        const data = await startGuessSoundGame(user.id);
        setSession(data);
        setCardsPhase("enterPrep");
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            setCardsPhase("idle");
          });
        });
        onGameStart();
        animatePanelsIn();
      } catch (err) {
        setError(err?.message || "Error al iniciar GuessSound.");
      } finally {
        setLoading(false);
      }
    },
    [animatePanelsIn, onGameStart, user?.id],
  );

  useEffect(() => {
    if (autoStart && !session && user?.id) {
      handleStart();
    }
  }, [autoStart, handleStart, session, user?.id]);

  const advanceRound = useCallback(
    async (nextSession) => {
      setRoundTransitioning(true);
      setCardsPhase("exit");
      await wait(ROUND_TRANSITION_MS);

      setSession(nextSession);
      setCardsPhase("enterPrep");
      await wait(30);
      setCardsPhase("idle");
      await wait(ROUND_TRANSITION_MS);

      setFlashState("");
      setRoundTransitioning(false);

      if (nextSession?.gameOver) {
        onGameEnd();
      }
    },
    [onGameEnd],
  );

  const handleGuessOption = async (pokemonId) => {
    if (
      !session ||
      session.gameOver ||
      loading ||
      awaitingManualAdvance ||
      roundTransitioning
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await guessSoundPokemon(user.id, pokemonId);
      const wasCorrect = Boolean(data?.ultimoAcierto);

      if (wasCorrect) {
        setFlashState("success");
        setFailedRoundInfo(null);
        setPendingSession(null);
        setAwaitingManualAdvance(false);
        setShowNextRoundUi(false);
        await wait(220);
        await advanceRound(data);
      } else {
        setFlashState("fail");

        if (data?.gameOver) {
          setShowNextRoundUi(false);
          await wait(220);
          await advanceRound(data);
        } else {
          setFailedRoundInfo({
            correctName: (data?.ultimoPokemonCorrecto || "?").toUpperCase(),
          });
          setPendingSession(data);
          setAwaitingManualAdvance(true);
          setShowNextRoundUi(false);
          window.requestAnimationFrame(() => {
            setShowNextRoundUi(true);
          });
        }
      }
    } catch (err) {
      setError(err?.message || "Error al responder la ronda.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextRound = async () => {
    if (!pendingSession || loading || roundTransitioning) return;

    setShowNextRoundUi(false);
    await wait(NEXT_ROUND_UI_EXIT_MS);
    setAwaitingManualAdvance(false);
    setFailedRoundInfo(null);
    await advanceRound(pendingSession);
    setPendingSession(null);
  };

  const handleForceLose = useCallback(async () => {
    if (!session || session.gameOver || !user?.id) return;

    setLoading(true);
    setError(null);
    try {
      const data = await forceLoseGuessSoundGame(user.id);
      setSession(data);
      setAwaitingManualAdvance(false);
      setPendingSession(null);
      setFailedRoundInfo(null);
      setShowNextRoundUi(false);
      setCardsPhase("idle");
      setFlashState("");
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

  const currentRound = session?.currentRound;
  const roundNumber = session?.currentRoundNumber ?? 1;
  const fallos = session?.fallos ?? 0;
  const aciertos = session?.aciertos ?? 0;
  const scoreGanado = session?.puntosGanados;
  const isInteractionLocked =
    loading || awaitingManualAdvance || roundTransitioning;

  if (!session) {
    if (autoStart || loading) {
      return (
        <div className={styles.startScreen}>
          <p className={styles.startTitle}>GUESS SOUND</p>
          <p className={styles.startTitle}>PREPARANDO PARTIDA...</p>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      );
    }

    return (
      <div className={styles.startScreen}>
        <p className={styles.startTitle}>GUESS SOUND</p>
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
        <div
          className={`${styles.panel} ${styles.mainPanel} ${panelsVisible ? styles.mainPanelVisible : ""} ${flashState === "success" ? styles.mainPanelFlashSuccess : ""} ${flashState === "fail" ? styles.mainPanelFlashFail : ""}`}
        >
          <div className={styles.mainPanelTint} />
          <div className={styles.mainPanelContent}>
            <div className={styles.headerRow}>
              <p className={styles.panelLabel}>GUESS SOUND</p>
              <p className={styles.roundLabel}>RONDA {roundNumber}/4</p>
            </div>

            <div className={styles.audioPanel}>
              {!session.gameOver ? (
                <>
                  <p className={styles.audioTitle}>Audio del Pokemon:</p>
                  <div className={styles.topContainer}>
                    <div className={styles.livesBar}>
                      PS&nbsp;
                      {Array.from({ length: MAX_FALLOS }, (_, i) => {
                        const remaining = MAX_FALLOS - fallos;
                        let colorClass = styles.lifeGreen;
                        if (remaining <= 1) colorClass = styles.lifeRed;
                        else if (remaining <= 2) colorClass = styles.lifeYellow;
                        const isUsed = i < fallos;

                        return (
                          <span
                            key={i}
                            className={`${styles.lifeBlock} ${isUsed ? styles.lifeUsed : colorClass}`}
                          />
                        );
                      })}
                    </div>
                    <audio
                      key={`${currentRound?.ronda}-${currentRound?.sonido}`}
                      className={styles.audioPlayer}
                      controls
                      preload="none"
                      src={currentRound?.sonido || ""}
                    />
                  </div>
                </>
              ) : (
                <div className={styles.topContainer}>
                  <div className={styles.livesBar}>
                    PS&nbsp;
                    {Array.from({ length: MAX_FALLOS }, (_, i) => {
                      const remaining = MAX_FALLOS - fallos;
                      let colorClass = styles.lifeGreen;
                      if (remaining <= 1) colorClass = styles.lifeRed;
                      else if (remaining <= 2) colorClass = styles.lifeYellow;
                      const isUsed = i < fallos;

                      return (
                        <span
                          key={i}
                          className={`${styles.lifeBlock} ${isUsed ? styles.lifeUsed : colorClass}`}
                        />
                      );
                    })}
                  </div>
                  <div className={styles.summaryBox}>
                    <p className={styles.audioEnded}>Partida finalizada</p>
                    <p className={styles.aciertos}>
                      Has Acertado: {aciertos}/4 pokemon
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!session.gameOver ? (
              <div
                className={`${styles.optionsGrid} ${cardsPhase === "idle" ? styles.optionsGridVisible : ""} ${cardsPhase === "exit" ? styles.optionsGridExit : ""}`}
              >
                {currentRound?.opciones?.map((option, index) => {
                  const totalOptions = currentRound?.opciones?.length ?? 0;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.optionBtn}
                      onClick={() => handleGuessOption(option.id)}
                      disabled={isInteractionLocked}
                    >
                      <div
                        className={styles.optionCard}
                        style={{
                          ...getOptionBackgroundStyle(
                            option.type1,
                            option.type2,
                          ),
                          "--card-index": index,
                          "--card-index-reverse": totalOptions - index - 1,
                        }}
                      >
                        <div className={styles.optionSpriteWrap}>
                          {option.spriteUrl ? (
                            <img
                              src={option.spriteUrl}
                              alt={option.name}
                              className={styles.optionSprite}
                            />
                          ) : (
                            <span className={styles.spriteFallback}>
                              SPRITE
                            </span>
                          )}
                        </div>
                        <p className={styles.optionName}>{option.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.resultBox}>
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
              </div>
            )}

            {awaitingManualAdvance && failedRoundInfo && (
              <div
                className={`${styles.nextRoundBox} ${showNextRoundUi ? styles.nextRoundBoxVisible : ""}`}
              >
                <p className={styles.failInfo}>
                  FALLASTE. ERA {failedRoundInfo.correctName}
                </p>
                <button
                  type="button"
                  className={`${styles.btnStart} ${styles.btnFinishRed} ${styles.btnNextRound}`}
                  onClick={handleNextRound}
                  disabled={loading || roundTransitioning}
                >
                  SIGUIENTE RONDA
                </button>
              </div>
            )}

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
                  <span className={styles.rankingScore}>{player.scoreM2}</span>
                </div>
              );
            })}
            {ranking.length === 0 && (
              <p className={styles.rankingEmpty}>Sin datos aun</p>
            )}
          </div>
        </div>
        {session.gameOver && (
          <div
            className={`${scoreGanado >= 0 ? styles.resultWin : styles.resultLose} ${resultVisible ? styles.resultVisible : ""}`}
          >
            {scoreGanado >= 0 ? "PARTIDA COMPLETADA" : "DERROTA"}
            <br />
            {scoreGanado >= 0 ? `+${scoreGanado} PTS` : `${scoreGanado} PTS`}
          </div>
        )}
      </div>
    </div>
  );
}

export default GuessSound;
