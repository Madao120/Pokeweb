import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./MultiplayerGuessSprite.module.css";
import { getGuessSpritePokemonList } from "../../services/api";

const MAX_DROPDOWN_RESULTS = 30;
const WINNERS_EXIT_MS = 240;

function formatClock(ms) {
  const safeMs = Math.max(0, ms || 0);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function normalizeSearch(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildOrderedPlayers(orderedPlayers, roomState, isMatchFinished) {
  return [...orderedPlayers].sort((a, b) => {
    if (isMatchFinished) {
      return (roomState?.roundScores?.[b.id] ?? 0) - (roomState?.roundScores?.[a.id] ?? 0);
    }

    const posA = roomState?.finishOrder?.findIndex((id) => String(id) === String(a.id));
    const posB = roomState?.finishOrder?.findIndex((id) => String(id) === String(b.id));
    const normalizedA = posA === -1 ? Number.MAX_SAFE_INTEGER : posA;
    const normalizedB = posB === -1 ? Number.MAX_SAFE_INTEGER : posB;
    if (normalizedA !== normalizedB) return normalizedA - normalizedB;

    return (roomState?.roundScores?.[b.id] ?? 0) - (roomState?.roundScores?.[a.id] ?? 0);
  });
}

function MultiplayerGuessSprite({
  user,
  roomState,
  orderedPlayers,
  socketConnected,
  actionLoading,
  onGuessSprite,
  onRepeatMode,
  onChangeMode,
  onFinishMatch,
  onRefreshState,
}) {
  const session = roomState?.mySession || null;
  const isLeader = String(roomState?.leaderId) === String(user?.id);
  const hostActionsDisabled = !isLeader || Boolean(actionLoading);
  const isPlaying = roomState?.state === "PLAYING";
  const isRoundFinished = roomState?.state === "ROUND_FINISHED";
  const isMatchFinished = roomState?.state === "FINISHED";
  const [query, setQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [pokemonOptions, setPokemonOptions] = useState([]);
  const [localError, setLocalError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [timerNow, setTimerNow] = useState(Date.now());
  const [showRoundResults, setShowRoundResults] = useState(isRoundFinished);
  const [roundResultsPhase, setRoundResultsPhase] = useState(
    isRoundFinished ? "enter" : "hidden",
  );
  const [delayMatchFinishedView, setDelayMatchFinishedView] = useState(false);
  const timeoutRefreshRef = useRef(false);
  const wasRoundFinishedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    timeoutRefreshRef.current = false;
  }, [roomState?.state, roomState?.countdownRemainingMs, roomState?.remainingMs]);

  useEffect(() => {
    setQuery("");
    setSelectedOption(null);
    setLocalError("");
    setFeedback("");
  }, [roomState?.state, roomState?.gameMode]);

  useEffect(() => {
    let enterFrameA;
    let enterFrameB;
    let exitTimer;

    if (isRoundFinished) {
      setShowRoundResults(true);
      setDelayMatchFinishedView(false);
      setRoundResultsPhase("enterPrep");
      enterFrameA = window.requestAnimationFrame(() => {
        enterFrameB = window.requestAnimationFrame(() => {
          setRoundResultsPhase("enter");
        });
      });
    } else if (wasRoundFinishedRef.current) {
      setRoundResultsPhase("exit");
      if (isMatchFinished) {
        setDelayMatchFinishedView(true);
      }
      exitTimer = window.setTimeout(() => {
        setShowRoundResults(false);
        setRoundResultsPhase("hidden");
        setDelayMatchFinishedView(false);
      }, WINNERS_EXIT_MS);
    } else {
      setShowRoundResults(false);
      setRoundResultsPhase("hidden");
      setDelayMatchFinishedView(false);
    }

    wasRoundFinishedRef.current = isRoundFinished;

    return () => {
      if (enterFrameA) window.cancelAnimationFrame(enterFrameA);
      if (enterFrameB) window.cancelAnimationFrame(enterFrameB);
      if (exitTimer) window.clearTimeout(exitTimer);
    };
  }, [isMatchFinished, isRoundFinished]);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const options = await getGuessSpritePokemonList();
        if (!cancelled) {
          setPokemonOptions(options || []);
        }
      } catch {
        if (!cancelled) {
          setPokemonOptions([]);
        }
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const cooldownMs = Math.max(0, (session?.nextGuessAllowedAtMs || 0) - timerNow);
  const showPostRoundActions = isRoundFinished || session?.gameOver;
  const showMatchFinishedView = isMatchFinished && !delayMatchFinishedView;
  const winnersCardClassName =
    roundResultsPhase === "exit"
      ? styles.resultsCardExit
      : roundResultsPhase === "enter"
        ? styles.resultsCardEnter
        : "";
  const canGuess =
    isPlaying &&
    countdownRemaining <= 0 &&
    !session?.gameOver &&
    cooldownMs <= 0 &&
    actionLoading !== "guess-sprite";

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

  const orderedRoomPlayers = useMemo(
    () => buildOrderedPlayers(orderedPlayers, roomState, isMatchFinished),
    [isMatchFinished, orderedPlayers, roomState],
  );

  const finalists = useMemo(() => {
    return orderedRoomPlayers.map((player) => ({
      ...player,
      roundPoints: roomState?.lastRoundPoints?.[player.id] ?? 0,
      totalPoints: roomState?.roundScores?.[player.id] ?? 0,
    }));
  }, [orderedRoomPlayers, roomState]);

  const handlePickOption = (option) => {
    setSelectedOption(option);
    setQuery(option.name);
    setLocalError("");
  };

  const handleGuess = async () => {
    if (!session || !canGuess) return;

    let optionToSend = selectedOption;
    if (!optionToSend && query.trim()) {
      const normalizedQuery = normalizeSearch(query.trim());
      optionToSend =
        pokemonOptions.find(
          (pokemon) => normalizeSearch(pokemon.name) === normalizedQuery,
        ) || null;
    }

    if (!optionToSend?.id) {
      setLocalError("Selecciona un Pokemon valido en el buscador.");
      return;
    }

    setLocalError("");
    setFeedback("");

    try {
      const data = await onGuessSprite(optionToSend.id);
      const nextSession = data?.mySession;
      setSelectedOption(null);
      setQuery("");

      if (nextSession?.ganado) {
        setFeedback("Has acertado el Pokemon.");
      } else {
        setFeedback("No era. Boton bloqueado 10 segundos y menos zoom.");
      }
    } catch (err) {
      setLocalError(err?.message || "No se pudo enviar la respuesta.");
    }
  };

  const maxFallos = session?.maxFallos ?? 7;
  const fallos = session?.fallos ?? 0;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.titleWrap}>
          <p className={styles.title}>GUESS SPRITE MULTIJUGADOR</p>
          <p className={styles.subtitle}>
            Sala {roomState?.roomCode} · {roomState?.state}
          </p>
        </div>
        <div className={styles.clockBox}>
          <span>{countdownRemaining > 0 ? "EMPIEZA EN" : "TIEMPO"}</span>
          <strong>
            {countdownRemaining > 0
              ? Math.max(1, Math.ceil(countdownRemaining / 1000))
              : formatClock(roundRemaining)}
          </strong>
        </div>
      </div>

      {!showMatchFinishedView ? (
        <>
          <div className={styles.topRow}>
            <div className={styles.leftColumn}>
              <div
                className={`${styles.panel} ${styles.searchPanel} ${
                  showPostRoundActions ? styles.searchPanelEnd : ""
                }`}
              >
                <p className={styles.panelLabel}>GUESS SPRITE</p>

                <div className={styles.livesBar}>
                  PS&nbsp;
                  {Array.from({ length: maxFallos }, (_, index) => {
                    const remaining = Math.max(0, maxFallos - Math.min(fallos, maxFallos));
                    let colorClass = styles.lifeGreen;
                    if (remaining <= 2) colorClass = styles.lifeRed;
                    else if (remaining <= 4) colorClass = styles.lifeYellow;
                    const isUsed = index < Math.min(fallos, maxFallos);

                    return (
                      <span
                        key={index}
                        className={`${styles.lifeBlock} ${isUsed ? styles.lifeUsed : colorClass}`}
                      />
                    );
                  })}
                </div>

                <p className={styles.pointsHint}>
                  {session?.gameOver
                    ? session?.ganado
                      ? "HAS ACERTADO EL POKEMON"
                      : "NO HAS LLEGADO A TIEMPO"
                    : cooldownMs > 0
                      ? `BLOQUEADO ${Math.ceil(cooldownMs / 1000)} SEG`
                      : `FALLOS: ${fallos}/${maxFallos}`}
                </p>

                {!session?.gameOver && (
                  <div className={styles.selectWrap}>
                    <div className={styles.searchRow}>
                      <input
                        className={styles.searchInput}
                        type="text"
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setSelectedOption(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleGuess();
                          }
                        }}
                        disabled={!isPlaying || countdownRemaining > 0}
                        placeholder="Escribe para buscar por nombre..."
                        autoComplete="off"
                      />
                      <button
                        className={`${styles.btnStart} ${styles.btnFinishRed}`}
                        type="button"
                        disabled={!canGuess}
                        onClick={handleGuess}
                      >
                        {cooldownMs > 0
                          ? `ADIVINAR ${Math.ceil(cooldownMs / 1000)}`
                          : actionLoading === "guess-sprite"
                            ? "..."
                            : "ADIVINAR"}
                      </button>
                    </div>

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
                  </div>
                )}

                {feedback && <p className={styles.feedback}>{feedback}</p>}
                {localError && <p className={styles.error}>{localError}</p>}

                {showPostRoundActions && (
                  <div className={`${styles.hostActions} ${styles.hostActionsInPanel}`}>
                    <button
                      className={`${styles.btnStart} ${styles.hostActionBtn} ${styles.btnFinishRed}`}
                      type="button"
                      disabled={hostActionsDisabled}
                      onClick={onRepeatMode}
                    >
                      {actionLoading === "repeat" ? "..." : "REPETIR MODO"}
                    </button>
                    <button
                      className={`${styles.btnStart} ${styles.hostActionBtn} ${styles.btnFinishYellow}`}
                      type="button"
                      disabled={hostActionsDisabled}
                      onClick={onChangeMode}
                    >
                      {actionLoading === "change-mode" ? "..." : "CAMBIAR MODO"}
                    </button>
                    <button
                      className={`${styles.btnStart} ${styles.hostActionBtn} ${styles.btnFinishBlue}`}
                      type="button"
                      disabled={hostActionsDisabled}
                      onClick={onFinishMatch}
                    >
                      {actionLoading === "finish-match" ? "..." : "TERMINAR PARTIDA"}
                    </button>
                  </div>
                )}
                {showPostRoundActions && !isLeader && (
                  <p className={styles.waitingText}>
                    Solo el lider puede continuar o terminar la partida.
                  </p>
                )}
              </div>
            </div>

            <div className={styles.middleColumn}>
              <div className={`${styles.panel} ${styles.imagePanel}`}>
                {countdownRemaining > 0 && (
                  <div className={styles.countdownOverlay}>
                    <p className={styles.countdownLabel}>A prepararos</p>
                    <p className={styles.countdownValue}>
                      {Math.max(1, Math.ceil(countdownRemaining / 1000))}
                    </p>
                  </div>
                )}
                <div className={styles.spriteViewport}>
                  {session?.pokemon?.spriteUrl ? (
                    <img
                      src={session.pokemon.spriteUrl}
                      alt={session?.gameOver ? roomState?.pokemonName || "Pokemon" : "Sprite oculto"}
                      className={`${styles.spriteImage} ${!session?.gameOver ? styles.spriteImageMasked : ""}`}
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

              {countdownRemaining > 0 && (
                <p className={styles.revealText}>
                  La ronda empieza en {Math.max(1, Math.ceil(countdownRemaining / 1000))}
                </p>
              )}

              {session?.gameOver && (
                <p className={styles.revealText}>
                  {session?.ganado
                    ? `CORRECTO! ERA ${roomState?.pokemonName?.toUpperCase() || "?"}`
                    : `NO LLEGASTE A TIEMPO. ERA ${roomState?.pokemonName?.toUpperCase() || "?"}`}
                </p>
              )}
            </div>

            {!isRoundFinished && (
              <div className={`${styles.panel} ${styles.rankingPanel}`}>
                <p className={styles.panelLabel}>TOP GAME</p>
                <div className={styles.playersList}>
                  {orderedRoomPlayers.map((player, index) => {
                    const finishedIndex = roomState?.finishOrder?.findIndex(
                      (id) => String(id) === String(player.id),
                    );
                    const hasFinished = finishedIndex !== -1;
                    const isCurrentUser = String(player.id) === String(user?.id);
                    const playerDone = roomState?.playerFinished?.[player.id];
                    const status = hasFinished
                      ? `#${finishedIndex + 1} acertado`
                      : playerDone
                        ? "Sin puntos"
                        : "Buscando";

                    return (
                      <div
                        key={player.id}
                        className={`${styles.playerCard} ${isCurrentUser ? styles.playerCardSelf : ""}`}
                      >
                        <span className={styles.playerPos}>
                          {hasFinished ? `#${finishedIndex + 1}` : `#${index + 1}`}
                        </span>
                        {player.profilePictureUrl ? (
                          <img
                            src={player.profilePictureUrl}
                            alt={player.name}
                            className={styles.playerAvatar}
                          />
                        ) : (
                          <div className={styles.playerAvatarFallback}>
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={styles.playerMeta}>
                          <span className={styles.playerName}>{player.name}</span>
                          <span className={styles.playerStatus}>{status}</span>
                          <span className={styles.playerHint}>
                            {roomState?.playerMaskedWords?.[player.id] || "-"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.connectionPill}>
                  {socketConnected ? "Conectado" : "Sin conexion"}
                </div>
              </div>
            )}
          </div>

          {showRoundResults && (
            <section className={`${styles.resultsCard} ${winnersCardClassName}`}>
              <p className={styles.blockTitle}>Resultado del minijuego</p>
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
                    <span className={styles.resultScore}>+{player.roundPoints} pts</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className={styles.finalCard}>
          <p className={styles.blockTitle}>Clasificacion final</p>
          <div className={styles.podiumList}>
            {finalists.map((player, index) => (
              <article
                key={player.id}
                className={`${styles.podiumRow} ${index === 0 ? styles.podiumWinner : ""}`}
              >
                <span className={styles.podiumPos}>#{index + 1}</span>
                <span className={styles.resultName}>{player.name}</span>
                <span className={styles.podiumScore}>{player.totalPoints} pts</span>
              </article>
            ))}
          </div>
          <div className={styles.hostActions}>
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
          </div>
        </section>
      )}
    </div>
  );
}

export default MultiplayerGuessSprite;
