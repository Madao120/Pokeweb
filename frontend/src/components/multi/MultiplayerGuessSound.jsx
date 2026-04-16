import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./MultiplayerGuessSound.module.css";

const ROUND_TRANSITION_MS = 320;
const NEXT_ROUND_UI_EXIT_MS = 260;
const FLASH_FADE_IN_MS = 280;
const FLASH_HOLD_MS = 170;
const FLASH_FADE_OUT_MS = 280;
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

function cloneSessionData(value) {
  if (!value) return value;
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function formatClock(ms) {
  const safeMs = Math.max(0, ms || 0);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function buildOrderedPlayers(orderedPlayers, roomState) {
  const finishOrder = roomState?.finishOrder || [];
  const finishTimesMs = roomState?.finishTimesMs || {};
  const playerLives = roomState?.playerLives || {};

  return [...orderedPlayers].sort((a, b) => {
    const livesA = playerLives[a.id] ?? 0;
    const livesB = playerLives[b.id] ?? 0;
    if (livesA !== livesB) return livesB - livesA;

    const posA = finishOrder.findIndex((id) => String(id) === String(a.id));
    const posB = finishOrder.findIndex((id) => String(id) === String(b.id));
    if (posA !== -1 && posB !== -1) return posA - posB;
    if (posA !== -1) return -1;
    if (posB !== -1) return 1;

    const timeA = finishTimesMs[a.id] ?? Number.MAX_SAFE_INTEGER;
    const timeB = finishTimesMs[b.id] ?? Number.MAX_SAFE_INTEGER;
    if (timeA !== timeB) return timeA - timeB;

    return (roomState?.roundScores?.[b.id] ?? 0) - (roomState?.roundScores?.[a.id] ?? 0);
  });
}

function MultiplayerGuessSound({
  user,
  roomState,
  orderedPlayers,
  socketConnected,
  actionLoading,
  onGuessSound,
  onRepeatMode,
  onChangeMode,
  onFinishMatch,
  onRefreshState,
}) {
  const [session, setSession] = useState(cloneSessionData(roomState?.mySession) || null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [panelsVisible, setPanelsVisible] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [flashState, setFlashState] = useState("");
  const [cardsPhase, setCardsPhase] = useState("idle");
  const [pendingSession, setPendingSession] = useState(null);
  const [visibleRound, setVisibleRound] = useState(
    cloneSessionData(roomState?.mySession?.currentRoundSound) || null,
  );
  const [visibleRoundNumber, setVisibleRoundNumber] = useState(
    roomState?.mySession?.currentRoundNumber ?? 1,
  );
  const [failedRoundInfo, setFailedRoundInfo] = useState(null);
  const [awaitingManualAdvance, setAwaitingManualAdvance] = useState(false);
  const [showNextRoundUi, setShowNextRoundUi] = useState(false);
  const [roundTransitioning, setRoundTransitioning] = useState(false);
  const [resolvingGuess, setResolvingGuess] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());

  const sessionRef = useRef(null);
  const timeoutRefreshRef = useRef(false);
  const isLeader = String(roomState?.leaderId) === String(user?.id);
  const hostActionsDisabled = !isLeader || Boolean(actionLoading);
  const isPlaying = roomState?.state === "PLAYING";
  const isRoundFinished = roomState?.state === "ROUND_FINISHED";
  const isMatchFinished = roomState?.state === "FINISHED";

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
    const timer = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    animatePanelsIn();
  }, [animatePanelsIn]);

  useEffect(() => {
    timeoutRefreshRef.current = false;
  }, [roomState?.state, roomState?.countdownRemainingMs, roomState?.remainingMs]);

  const countdownRemaining = useMemo(() => {
    const base = roomState?.countdownRemainingMs || 0;
    if (!base) return 0;
    const syncedAt = roomState?._syncedAt || timerNow;
    return Math.max(0, base - (timerNow - syncedAt));
  }, [roomState, timerNow]);

  const roundRemaining = useMemo(() => {
    const base = roomState?.remainingMs || 0;
    const syncedAt = roomState?._syncedAt || timerNow;
    return Math.max(
      0,
      base - Math.max(0, timerNow - syncedAt - (roomState?.countdownRemainingMs || 0)),
    );
  }, [roomState, timerNow]);

  useEffect(() => {
    if (!isPlaying) return;
    if (countdownRemaining > 0 || roundRemaining > 0 || timeoutRefreshRef.current) {
      return;
    }
    timeoutRefreshRef.current = true;
    onRefreshState?.();
  }, [countdownRemaining, isPlaying, onRefreshState, roundRemaining]);

  useEffect(() => {
    const incomingSession = roomState?.mySession || null;
    if (!incomingSession) {
      setSession(null);
      setVisibleRound(null);
      setVisibleRoundNumber(1);
      return;
    }

    const detachedIncomingSession = cloneSessionData(incomingSession);

    if (
      awaitingManualAdvance ||
      resolvingGuess ||
      roundTransitioning ||
      flashState === "success" ||
      flashState === "fail"
    ) {
      setPendingSession(detachedIncomingSession);
      return;
    }

    if (isRoundFinished || isMatchFinished) {
      setSession(detachedIncomingSession);
      setVisibleRound(cloneSessionData(detachedIncomingSession?.currentRoundSound) || null);
      setVisibleRoundNumber(detachedIncomingSession?.currentRoundNumber ?? 1);
      setPendingSession(null);
      setAwaitingManualAdvance(false);
      setShowNextRoundUi(false);
      return;
    }

    setSession(detachedIncomingSession);
    setVisibleRound(cloneSessionData(detachedIncomingSession?.currentRoundSound) || null);
    setVisibleRoundNumber(detachedIncomingSession?.currentRoundNumber ?? 1);
  }, [
    awaitingManualAdvance,
    flashState,
    isMatchFinished,
    isRoundFinished,
    roomState?.mySession,
    resolvingGuess,
    roundTransitioning,
  ]);

  useEffect(() => {
    if (!session?.gameOver) {
      setResultVisible(false);
      return;
    }

    setResultVisible(false);
    const frameId = window.requestAnimationFrame(() => {
      setResultVisible(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [session?.gameOver, session?.puntosGanados]);

  useEffect(() => {
    if (!visibleRound || awaitingManualAdvance) return;
    setCardsPhase("enterPrep");
    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setCardsPhase("idle");
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [awaitingManualAdvance, visibleRound?.ronda]);

  useEffect(() => {
    const isTerminalState =
      roomState?.state === "ROUND_FINISHED" || roomState?.state === "FINISHED";

    // Keep fail-reveal UI alive until the player confirms "SIGUIENTE RONDA",
    // even if the room already moved to a terminal state.
    if (awaitingManualAdvance && isTerminalState) {
      setResolvingGuess(false);
      return;
    }

    setLocalError(null);
    setFlashState("");
    setPendingSession(null);
    setFailedRoundInfo(null);
    setAwaitingManualAdvance(false);
    setShowNextRoundUi(false);
    setRoundTransitioning(false);
    setResolvingGuess(false);
  }, [awaitingManualAdvance, roomState?.state, roomState?.gameMode]);

  const advanceRound = useCallback(async (nextSession, options = {}) => {
    const { skipExit = false } = options;

    setRoundTransitioning(true);
    if (!skipExit) {
      setCardsPhase("exit");
      await wait(ROUND_TRANSITION_MS);
    }

    setSession(nextSession);
    setVisibleRound(cloneSessionData(nextSession?.currentRoundSound) || null);
    setVisibleRoundNumber(nextSession?.currentRoundNumber ?? 1);
    setCardsPhase("enterPrep");
    await wait(30);
    setCardsPhase("idle");
    await wait(ROUND_TRANSITION_MS);

    setFlashState("");
    setRoundTransitioning(false);
  }, []);

  const handleGuessOption = async (pokemonId) => {
    if (
      !session ||
      session.gameOver ||
      loading ||
      awaitingManualAdvance ||
      roundTransitioning ||
      countdownRemaining > 0
    ) {
      return;
    }

    setLoading(true);
    setLocalError(null);
    setResolvingGuess(true);

    try {
      const currentVisibleSession = sessionRef.current;
      const data = await onGuessSound(pokemonId);
      const nextSession = cloneSessionData(data?.mySession);
      const wasCorrect = Boolean(nextSession?.ultimoAcierto);

      if (wasCorrect) {
        setRoundTransitioning(true);
        setFlashState("success");
        setFailedRoundInfo(null);
        setPendingSession(nextSession);
        setAwaitingManualAdvance(false);
        setShowNextRoundUi(false);
        setCardsPhase("exit");
        await wait(Math.max(ROUND_TRANSITION_MS, FLASH_FADE_IN_MS + FLASH_HOLD_MS));
        setFlashState("");
        await wait(FLASH_FADE_OUT_MS);
        await advanceRound(nextSession, { skipExit: true });
        setPendingSession(null);
        setResolvingGuess(false);
      } else {
        const frozenFailedSession = {
          ...nextSession,
          currentRoundSound: cloneSessionData(currentVisibleSession?.currentRoundSound) || null,
          currentRoundNumber:
            currentVisibleSession?.currentRoundNumber ??
            nextSession?.currentRoundNumber,
        };

        setFlashState("fail");
        setSession(frozenFailedSession);
        setVisibleRound(
          cloneSessionData(currentVisibleSession?.currentRoundSound) || null,
        );
        setVisibleRoundNumber(
          currentVisibleSession?.currentRoundNumber ??
            nextSession?.currentRoundNumber ??
            1,
        );
        setPendingSession(nextSession);
        setFailedRoundInfo({
          correctName: (nextSession?.ultimoPokemonCorrecto || "?").toUpperCase(),
        });
        setAwaitingManualAdvance(true);
        setShowNextRoundUi(false);
        setResolvingGuess(false);
        window.requestAnimationFrame(() => {
          setShowNextRoundUi(true);
        });
      }
    } catch (err) {
      setResolvingGuess(false);
      setLocalError(err?.message || "Error al responder la ronda.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextRound = async () => {
    if (!pendingSession || loading || roundTransitioning) return;

    setRoundTransitioning(true);
    setShowNextRoundUi(false);
    await wait(NEXT_ROUND_UI_EXIT_MS);
    setCardsPhase("exit");
    setFlashState("");
    await wait(Math.max(FLASH_FADE_OUT_MS, ROUND_TRANSITION_MS));
    setAwaitingManualAdvance(false);
    setFailedRoundInfo(null);
    await advanceRound(pendingSession, { skipExit: true });
    setPendingSession(null);
  };

  const orderedRoomPlayers = useMemo(
    () => buildOrderedPlayers(orderedPlayers, roomState),
    [orderedPlayers, roomState],
  );

  const finalists = useMemo(() => {
    return orderedRoomPlayers.map((player) => ({
      ...player,
      roundPoints: roomState?.lastRoundPoints?.[player.id] ?? 0,
      totalPoints: roomState?.roundScores?.[player.id] ?? 0,
      lives: roomState?.playerLives?.[player.id] ?? 0,
      hits: roomState?.playerHits?.[player.id] ?? 0,
    }));
  }, [orderedRoomPlayers, roomState]);

  const currentRound = visibleRound;
  const roundNumber = visibleRoundNumber;
  const fallos = session?.fallos ?? 0;
  const aciertos = session?.aciertos ?? 0;
  const scoreGanado = session?.puntosGanados ?? 0;
  const showFailTint = flashState === "fail" || awaitingManualAdvance;
  const holdFailReveal = awaitingManualAdvance;
  const showRoundFinishedState = isRoundFinished && !holdFailReveal;
  const showMatchFinishedState = isMatchFinished && !holdFailReveal;
  const isInteractionLocked =
    loading || awaitingManualAdvance || roundTransitioning || countdownRemaining > 0;

  return (
    <div className={styles.page}>
      <div className={styles.multiTopBar}>
        <div>
          <p className={styles.multiTitle}>GuessSound Multijugador</p>
          <p className={styles.multiSubtitle}>
            Sala {roomState?.roomCode} · {roomState?.state}
          </p>
        </div>
        <div className={styles.clockBox}>
          <span>{countdownRemaining > 0 ? "Empieza en" : "Tiempo"}</span>
          <strong>
            {countdownRemaining > 0
              ? Math.max(1, Math.ceil(countdownRemaining / 1000))
              : formatClock(roundRemaining)}
          </strong>
        </div>
      </div>

      <div className={styles.container}>
        <div
          className={`${styles.topRow} ${
            showRoundFinishedState || showMatchFinishedState ? styles.topRowEndState : ""
          }`}
        >
          {!showMatchFinishedState ? (
            <>
              <div
                className={`${styles.panel} ${styles.mainPanel} ${
                  panelsVisible ? styles.mainPanelVisible : ""
                } ${flashState === "success" ? styles.mainPanelFlashSuccess : ""} ${
                  showFailTint ? styles.mainPanelFlashFail : ""
                }`}
              >
                {countdownRemaining > 0 && (
                  <div className={styles.countdownOverlay}>
                    <p className={styles.countdownLabel}>A prepararos</p>
                    <p className={styles.countdownValue}>
                      {Math.max(1, Math.ceil(countdownRemaining / 1000))}
                    </p>
                  </div>
                )}
                <div className={styles.mainPanelTint} />
                <div className={styles.mainPanelContent}>
                  <div className={styles.headerRow}>
                    <p className={styles.panelLabel}>GUESS SOUND</p>
                    <p className={styles.roundLabel}>RONDA {roundNumber}/4</p>
                  </div>

                  <div className={styles.audioPanel}>
                    {!session?.gameOver ? (
                      <>
                        <p className={styles.audioTitle}>Audio del Pokemon:</p>
                        <div className={styles.topContainer}>
                          <div className={styles.livesBar}>
                            PS&nbsp;
                            {Array.from({ length: session?.totalLives ?? 4 }, (_, i) => {
                              const remaining = session?.vidasRestantes ?? 0;
                              let colorClass = styles.lifeGreen;
                              if (remaining <= 1) colorClass = styles.lifeRed;
                              else if (remaining <= 2) colorClass = styles.lifeYellow;
                              const isUsed = i >= remaining;

                              return (
                                <span
                                  key={i}
                                  className={`${styles.lifeBlock} ${
                                    isUsed ? styles.lifeUsed : colorClass
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <div className={styles.multiStats}>
                            <span>Aciertos: {aciertos}</span>
                            <span>Fallos: {fallos}</span>
                          </div>
                        </div>
                        <audio
                          key={`${currentRound?.ronda}-${currentRound?.sonido}`}
                          className={styles.audioPlayer}
                          controls
                          preload="none"
                          src={currentRound?.sonido || ""}
                        />
                      </>
                    ) : (
                      <div className={styles.topContainer}>
                        <div className={styles.livesBar}>
                          PS&nbsp;
                          {Array.from({ length: session?.totalLives ?? 4 }, (_, i) => {
                            const remaining = session?.vidasRestantes ?? 0;
                            let colorClass = styles.lifeGreen;
                            if (remaining <= 1) colorClass = styles.lifeRed;
                            else if (remaining <= 2) colorClass = styles.lifeYellow;
                            const isUsed = i >= remaining;

                            return (
                              <span
                                key={i}
                                className={`${styles.lifeBlock} ${
                                  isUsed ? styles.lifeUsed : colorClass
                                }`}
                              />
                            );
                          })}
                        </div>
                        <div className={styles.summaryBox}>
                          <p className={styles.audioEnded}>Partida finalizada</p>
                          <p className={styles.aciertos}>
                            Has acertado: {aciertos}/4 pokemon
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!session?.gameOver ? (
                    <div
                      className={`${styles.optionsGrid} ${
                        cardsPhase === "idle" ? styles.optionsGridVisible : ""
                      } ${cardsPhase === "exit" ? styles.optionsGridExit : ""}`}
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
                                ...getOptionBackgroundStyle(option.type1, option.type2),
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
                                  <span className={styles.spriteFallback}>SPRITE</span>
                                )}
                              </div>
                              <p className={styles.optionName}>{option.name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <p className={styles.gameOver}>Partida terminada</p>
                    </div>
                  )}

                  {awaitingManualAdvance && failedRoundInfo && (
                    <div
                      className={`${styles.nextRoundBox} ${
                        showNextRoundUi ? styles.nextRoundBoxVisible : ""
                      }`}
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

                  {localError && <p className={styles.error}>{localError}</p>}
                </div>
              </div>

              {!showRoundFinishedState && (
                <div
                  className={`${styles.panel} ${styles.rankingPanel} ${
                    panelsVisible ? styles.rankingPanelVisible : ""
                  }`}
                >
                  <p className={styles.panelLabel}>TOP GAME</p>
                  <div className={styles.rankingList}>
                    {orderedRoomPlayers.map((player, i) => {
                      const isCurrentUser = player.id === user?.id;
                      const lives = roomState?.playerLives?.[player.id] ?? 0;
                      const hits = roomState?.playerHits?.[player.id] ?? 0;
                      const isDone = Boolean(roomState?.playerFinished?.[player.id]);

                      return (
                        <div
                          key={player.id}
                          className={`${styles.rankingRow} ${
                            isCurrentUser ? styles.rankingRowCurrentUser : ""
                          }`}
                        >
                          <span className={styles.rankingPos}>#{i + 1}</span>
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
                          <div className={styles.rankingMeta}>
                            <span className={styles.rankingName}>{player.name}</span>
                            <span className={styles.rankingSub}>
                              {isDone ? "Terminado" : "Jugando"}
                            </span>
                          </div>
                          <span className={styles.rankingScore}>
                            {lives} PS · {hits}/4
                          </span>
                        </div>
                      );
                    })}
                    {orderedRoomPlayers.length === 0 && (
                      <p className={styles.rankingEmpty}>Sin datos aun</p>
                    )}
                  </div>
                  <div className={styles.connectionPill}>
                    {socketConnected ? "Conectado" : "Sin conexion"}
                  </div>
                </div>
              )}

              {showRoundFinishedState && (
                <section className={styles.resultsCard}>
                  <p className={styles.panelLabel}>RESULTADO DEL MINIJUEGO</p>
                  <div className={styles.resultsList}>
                    {finalists.map((player, index) => (
                      <div className={styles.resultRow} key={player.id}>
                        <span className={styles.resultPos}>#{index + 1}</span>
                        {player.profilePictureUrl ? (
                          <img
                            className={styles.resultAvatar}
                            src={player.profilePictureUrl}
                            alt={player.name}
                          />
                        ) : (
                          <div className={styles.resultAvatarFallback}>
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={styles.resultName}>{player.name}</span>
                        <span className={styles.resultMeta}>{player.lives} PS · {player.hits}/4</span>
                        <span className={styles.resultScore}>+{player.roundPoints} PTS</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.botonesFin}>
                    <button
                      className={`${styles.btnStart} ${styles.btnFinishRed}`}
                      onClick={onRepeatMode}
                      disabled={hostActionsDisabled}
                    >
                      {actionLoading === "repeat" ? "..." : "REPETIR MODO"}
                    </button>
                    <button
                      className={`${styles.btnStart} ${styles.btnFinishYellow}`}
                      onClick={onChangeMode}
                      disabled={hostActionsDisabled}
                    >
                      {actionLoading === "change-mode" ? "..." : "CAMBIAR MODO"}
                    </button>
                    <button
                      className={`${styles.btnStart} ${styles.btnFinishBlue}`}
                      onClick={onFinishMatch}
                      disabled={hostActionsDisabled}
                    >
                      {actionLoading === "finish-match" ? "..." : "TERMINAR PARTIDA"}
                    </button>
                  </div>
                  {!isLeader && (
                    <p className={styles.waitingText}>
                      Solo el lider puede continuar o terminar la partida.
                    </p>
                  )}
                </section>
              )}
            </>
          ) : (
            <section className={styles.finalCard}>
              <p className={styles.panelLabel}>CLASIFICACION FINAL</p>
              <div className={styles.resultsList}>
                {finalists
                  .slice()
                  .sort((a, b) => b.totalPoints - a.totalPoints)
                  .map((player, index) => (
                    <div className={styles.resultRow} key={player.id}>
                      <span className={styles.resultPos}>#{index + 1}</span>
                      {player.profilePictureUrl ? (
                        <img
                          className={styles.resultAvatar}
                          src={player.profilePictureUrl}
                          alt={player.name}
                        />
                      ) : (
                        <div className={styles.resultAvatarFallback}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={styles.resultName}>{player.name}</span>
                      <span className={styles.resultScore}>{player.totalPoints} PTS</span>
                    </div>
                  ))}
              </div>
              <button
                className={`${styles.btnStart} ${styles.btnFinishBlue}`}
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("returnToModeMenu", {
                      detail: { skipDelay: true, skipMultiplayerConfirm: true },
                    }),
                  )
                }
              >
                VOLVER AL MENU
              </button>
            </section>
          )}

          {session?.gameOver && !showRoundFinishedState && !showMatchFinishedState && (
            <div
              className={`${
                scoreGanado >= 0 ? styles.resultWin : styles.resultLose
              } ${resultVisible ? styles.resultVisible : ""}`}
            >
              {scoreGanado >= 0 ? "PARTIDA COMPLETADA" : "DERROTA"}
              <br />
              {scoreGanado >= 0 ? `+${scoreGanado} PTS` : `${scoreGanado} PTS`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiplayerGuessSound;
