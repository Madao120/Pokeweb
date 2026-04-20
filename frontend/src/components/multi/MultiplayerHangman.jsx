import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./MultiplayerHangman.module.css";

const LETTER_COOLDOWN_MS = 5000;
const WORD_COOLDOWN_MS = 5000;
const ROUND_DURATION_MS = 3 * 60 * 1000;
const TYPE_1_REVEAL_MS = 60 * 1000;
const GENERATION_REVEAL_MS = 2 * 60 * 1000;
const TYPE_2_REVEAL_MS = 2 * 60 * 1000 + 30 * 1000;

function formatClock(ms) {
  const safeMs = Math.max(0, ms || 0);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function isLetterCharacter(value) {
  return /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ]$/.test(value);
}

function sanitizeWordInput(value) {
  return Array.from(value)
    .filter((char) => isLetterCharacter(char))
    .join("");
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function toTypeClassName(value) {
  return normalizeName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

function buildOrderedPlayers(orderedPlayers, roomState) {
  const finishOrder = roomState?.finishOrder || [];
  const finishedSet = new Set(finishOrder.map(String));
  const first = finishOrder
    .map((id) => orderedPlayers.find((player) => String(player.id) === String(id)))
    .filter(Boolean);

  const rest = orderedPlayers.filter((player) => !finishedSet.has(String(player.id)));
  return [...first, ...rest];
}

function MultiplayerHangman({
  user,
  roomState,
  orderedPlayers,
  socketConnected,
  actionLoading,
  onGuessLetter,
  onGuessWord,
  onRepeatMode,
  onChangeMode,
  onFinishMatch,
  onRefreshState,
}) {
  const session = roomState?.mySession || null;
  const isLeader = String(roomState?.leaderId) === String(user?.id);
  const isPlaying = roomState?.state === "PLAYING";
  const isRoundFinished = roomState?.state === "ROUND_FINISHED";
  const isMatchFinished = roomState?.state === "FINISHED";
  const orderedRoomPlayers = useMemo(
    () => buildOrderedPlayers(orderedPlayers, roomState),
    [orderedPlayers, roomState],
  );
  const [letter, setLetter] = useState("");
  const [word, setWord] = useState("");
  const [localError, setLocalError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [letterCooldownUntil, setLetterCooldownUntil] = useState(0);
  const [wordCooldownUntil, setWordCooldownUntil] = useState(0);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [spriteUrl, setSpriteUrl] = useState(null);
  const letterInputRef = useRef(null);
  const timeoutRefreshRef = useRef(false);
  const hintRefreshRef = useRef({
    type1: false,
    generation: false,
    type2: false,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    timeoutRefreshRef.current = false;
    hintRefreshRef.current = {
      type1: false,
      generation: false,
      type2: false,
    };
  }, [roomState?.state, roomState?.countdownRemainingMs, roomState?.remainingMs]);

  useEffect(() => {
    setLetter("");
    setWord("");
    setFeedback("");
    setLocalError("");
  }, [roomState?.state, roomState?.gameMode]);

  useEffect(() => {
    if (isPlaying && countdownRemaining <= 0 && !session?.gameOver) {
      letterInputRef.current?.focus();
    }
  }, [countdownRemaining, isPlaying, session?.gameOver]);

  useEffect(() => {
    const pokemonName = roomState?.pokemonName;
    if (!pokemonName) {
      setSpriteUrl(null);
      return;
    }

    let cancelled = false;
    const loadSprite = async () => {
      try {
        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${normalizeName(pokemonName)}`,
        );
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setSpriteUrl(
          data?.sprites?.other?.["official-artwork"]?.front_default ||
            data?.sprites?.front_default ||
            null,
        );
      } catch {
        if (!cancelled) setSpriteUrl(null);
      }
    };

    loadSprite();
    return () => {
      cancelled = true;
    };
  }, [roomState?.pokemonName]);

  const countdownRemaining = useMemo(() => {
    const base = roomState?.countdownRemainingMs || 0;
    if (!base) return 0;
    const syncedAt = roomState?._syncedAt || timerNow;
    return Math.max(0, base - (timerNow - syncedAt));
  }, [roomState, timerNow]);

  const roundRemaining = useMemo(() => {
    const base = roomState?.remainingMs || 0;
    const syncedAt = roomState?._syncedAt || timerNow;
    return Math.max(0, base - Math.max(0, timerNow - syncedAt - (roomState?.countdownRemainingMs || 0)));
  }, [roomState, timerNow]);

  const elapsedRoundMs = useMemo(() => {
    if (!isPlaying || countdownRemaining > 0) return 0;
    return Math.max(0, ROUND_DURATION_MS - roundRemaining);
  }, [countdownRemaining, isPlaying, roundRemaining]);

  const mostrarTipo1 = Boolean(session?.mostrarTipo1) || elapsedRoundMs >= TYPE_1_REVEAL_MS;
  const mostrarGeneracion =
    Boolean(session?.mostrarGeneracion) || elapsedRoundMs >= GENERATION_REVEAL_MS;
  const mostrarTipo2 = Boolean(session?.mostrarTipo2) || elapsedRoundMs >= TYPE_2_REVEAL_MS;

  const type1Class = styles[`type${toTypeClassName(roomState?.pokemonType1)}`] || "";
  const type2Class = styles[`type${toTypeClassName(roomState?.pokemonType2)}`] || "";

  useEffect(() => {
    if (!isPlaying) return;
    if (countdownRemaining > 0 || roundRemaining > 0 || timeoutRefreshRef.current) {
      return;
    }
    timeoutRefreshRef.current = true;
    onRefreshState?.();
  }, [countdownRemaining, isPlaying, onRefreshState, roundRemaining]);

  useEffect(() => {
    if (!isPlaying || countdownRemaining > 0) return;

    const milestones = [
      ["type1", elapsedRoundMs >= TYPE_1_REVEAL_MS],
      ["generation", elapsedRoundMs >= GENERATION_REVEAL_MS],
      ["type2", elapsedRoundMs >= TYPE_2_REVEAL_MS],
    ];

    const shouldRefresh = milestones.some(([key, reached]) => {
      if (!reached || hintRefreshRef.current[key]) return false;
      hintRefreshRef.current[key] = true;
      return true;
    });

    if (shouldRefresh) {
      onRefreshState?.();
    }
  }, [countdownRemaining, elapsedRoundMs, isPlaying, onRefreshState]);

  const letterCooldownMs = Math.max(0, letterCooldownUntil - timerNow);
  const wordCooldownMs = Math.max(0, wordCooldownUntil - timerNow);
  const guessedLetters = session?.guessedLetters
    ? Array.from(session.guessedLetters)
    : [];
  const intentos = session?.intentos ?? 0;
  const maxIntentos = 7;
  const letterDisabled =
    !isPlaying ||
    countdownRemaining > 0 ||
    !letter ||
    Boolean(letterCooldownMs) ||
    actionLoading === "guess-letter" ||
    session?.gameOver;
  const wordDisabled =
    !isPlaying ||
    countdownRemaining > 0 ||
    !word.trim() ||
    Boolean(wordCooldownMs) ||
    actionLoading === "guess-word" ||
    session?.gameOver;

  const handleGuessLetter = async () => {
    if (letterDisabled) return;
    const previousAttempts = session?.intentos ?? 0;
    const previousMasked = session?.maskedWord ?? "";
    setLocalError("");

    try {
      const data = await onGuessLetter(letter);
      const nextSession = data?.mySession;
      const failedAttempt =
        (nextSession?.intentos ?? previousAttempts) > previousAttempts;
      const unchangedMask = (nextSession?.maskedWord ?? "") === previousMasked;
      if (failedAttempt || unchangedMask) {
        setLetterCooldownUntil(Date.now() + LETTER_COOLDOWN_MS);
      }
      if (nextSession?.ganado) {
        setFeedback("Has terminado el minijuego.");
      } else if (failedAttempt) {
        setFeedback("Letra incorrecta. Boton bloqueado 5 segundos.");
      } else {
        setFeedback("Letra acertada.");
      }
      setLetter("");
      if (!nextSession?.gameOver) {
        window.requestAnimationFrame(() => {
          letterInputRef.current?.focus();
        });
      }
    } catch (err) {
      setLocalError(err?.message || "No se pudo enviar la letra.");
    }
  };

  const handleGuessWord = async () => {
    if (wordDisabled) return;
    const previousAttempts = session?.intentos ?? 0;
    setLocalError("");

    try {
      const data = await onGuessWord(word);
      const nextSession = data?.mySession;
      const failedAttempt =
        !(nextSession?.ganado) &&
        (nextSession?.intentos ?? previousAttempts) > previousAttempts;
      if (failedAttempt) {
        setWordCooldownUntil(Date.now() + WORD_COOLDOWN_MS);
        setFeedback("Palabra incorrecta. Boton bloqueado 5 segundos.");
      } else if (nextSession?.ganado) {
        setFeedback("Has acertado el Pokemon.");
      }
      setWord("");
    } catch (err) {
      setLocalError(err?.message || "No se pudo enviar la palabra.");
    }
  };

  const finalists = useMemo(() => {
    return orderedPlayers
      .map((player) => ({
        ...player,
        roundPoints: roomState?.lastRoundPoints?.[player.id] ?? 0,
        totalPoints: roomState?.roundScores?.[player.id] ?? 0,
      }))
      .sort((a, b) => {
        if (isMatchFinished) return b.totalPoints - a.totalPoints;
        const posA = roomState?.finishOrder?.findIndex((id) => String(id) === String(a.id));
        const posB = roomState?.finishOrder?.findIndex((id) => String(id) === String(b.id));
        const normalizedA = posA === -1 ? Number.MAX_SAFE_INTEGER : posA;
        const normalizedB = posB === -1 ? Number.MAX_SAFE_INTEGER : posB;
        if (normalizedA !== normalizedB) return normalizedA - normalizedB;
        return b.totalPoints - a.totalPoints;
      });
  }, [isMatchFinished, orderedPlayers, roomState]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <main
          className={`${styles.mainPanel} ${
            isRoundFinished || isMatchFinished ? styles.mainPanelEndState : ""
          }`}
        >
          {!isMatchFinished ? (
            <>
              <div className={styles.mainTop}>
                <div>
                  <p className={styles.title}>Ahorcado Multijugador</p>
                  <p className={styles.subtitle}>
                    Sala {roomState?.roomCode} · {roomState?.state}
                  </p>
                </div>
                <div className={styles.clockBox}>
                  {countdownRemaining > 0 ? "Empieza en" : "Tiempo"}
                  <strong>
                    {countdownRemaining > 0
                      ? Math.max(1, Math.ceil(countdownRemaining / 1000))
                      : formatClock(roundRemaining)}
                  </strong>
                </div>
              </div>

              <div
                className={`${styles.playfield} ${
                  isRoundFinished ? styles.playfieldRoundFinished : ""
                }`}
              >
                <section className={styles.wordPanel}>
                  {countdownRemaining > 0 && (
                    <div className={styles.countdownOverlay}>
                      <p className={styles.countdownLabel}>A prepararos</p>
                      <p className={styles.countdownValue}>
                        {Math.max(1, Math.ceil(countdownRemaining / 1000))}
                      </p>
                    </div>
                  )}

                  <div className={styles.gameLayout}>
                    <div className={styles.mainColumn}>
                      <p className={styles.blockLabel}>Pokemon a adivinar</p>
                      <p className={styles.maskedWord}>
                        {session?.maskedWord?.split("").join(" ") || "-"}
                      </p>

                      <div className={styles.bottomRow}>
                        <div className={styles.bottomLeft}>
                          <div className={styles.livesBar}>
                            PS&nbsp;
                            {Array.from({ length: maxIntentos }, (_, i) => {
                              const remaining = maxIntentos - intentos;
                              let colorClass = styles.lifeGreen;
                              if (remaining <= 2) colorClass = styles.lifeRed;
                              else if (remaining <= 4) colorClass = styles.lifeYellow;
                              const isUsed = i < intentos;

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

                          <p className={styles.usedLetters}>
                            <span className={styles.usedLabel}>USADAS:</span>{" "}
                            {guessedLetters.length
                              ? guessedLetters.join(", ")
                              : "-"}
                          </p>

                          {(feedback || localError) && (
                            <div className={styles.messages}>
                              {feedback && (
                                <p className={styles.feedback}>{feedback}</p>
                              )}
                              {localError && (
                                <p className={styles.error}>{localError}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className={styles.spriteDock}>
                          <div className={styles.spriteReveal}>
                            {!session?.gameOver ? (
                              <img
                                src="/ball1.png"
                                alt="Poke Ball"
                                className={styles.ballImg}
                              />
                            ) : spriteUrl ? (
                              <img
                                src={spriteUrl}
                                alt={roomState?.pokemonName || "Pokemon"}
                                className={styles.sprite}
                              />
                            ) : (
                              <div className={styles.spriteFallback}>
                                SPRITE
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.hintsPanel}>
                      <div className={styles.hintList}>
                        <div className={styles.hintRow}>
                          <span className={styles.hintKey}>Tipo 1:</span>
                          <strong
                            className={`${mostrarTipo1 ? styles.typeBadge : styles.hintValue} ${mostrarTipo1 ? type1Class : ""}`}
                          >
                            {mostrarTipo1
                              ? roomState?.pokemonType1 || "-"
                              : "Se revela al 1:00"}
                          </strong>
                        </div>
                        <div className={styles.hintRow}>
                          <span className={styles.hintKey}>Generacion:</span>
                          <strong className={styles.hintValue}>
                            {mostrarGeneracion
                              ? roomState?.pokemonGeneration || "-"
                              : "Se revela al 2:00"}
                          </strong>
                        </div>
                        <div className={styles.hintRow}>
                          <span className={styles.hintKey}>Tipo 2:</span>
                          <strong
                            className={`${mostrarTipo2 ? styles.typeBadge : styles.hintValue} ${mostrarTipo2 ? type2Class : ""}`}
                          >
                            {mostrarTipo2
                              ? roomState?.pokemonType2 || "ninguno"
                              : "Se revela al 2:30"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {!isRoundFinished && (
                  <aside className={styles.playersPanel}>
                    <div className={styles.sideHeader}>
                      <p className={styles.sideTitle}>TOP GAME</p>
                      <span className={styles.connectionTag}>
                        {socketConnected ? "Conectado" : "Sin conexion"}
                      </span>
                    </div>

                    <div className={styles.playersList}>
                      {orderedRoomPlayers.map((player, index) => {
                        const finishedIndex = roomState?.finishOrder?.findIndex(
                          (id) => String(id) === String(player.id),
                        );
                        const hasFinished = finishedIndex !== -1;
                        const playerDone = roomState?.playerFinished?.[player.id];
                        const roundPoints =
                          roomState?.lastRoundPoints?.[player.id] ?? 0;
                        const totalPoints =
                          roomState?.roundScores?.[player.id] ?? 0;
                        let status = "Jugando";
                        if (!isPlaying && !isRoundFinished && !isMatchFinished) {
                          status = "Preparado";
                        }
                        if (hasFinished) status = `#${finishedIndex + 1} terminado`;
                        if (!hasFinished && playerDone && isRoundFinished) {
                          status = "Sin puntos";
                        }
                        if (isMatchFinished) status = `${totalPoints} pts`;

                        return (
                          <article
                            key={player.id}
                            className={`${styles.playerCard} ${String(player.id) === String(user?.id) ? styles.playerCardSelf : ""}`}
                          >
                            <div className={styles.playerPos}>
                              {isMatchFinished
                                ? `#${index + 1}`
                                : hasFinished
                                  ? `#${finishedIndex + 1}`
                                  : "..."}
                            </div>
                            {player.profilePictureUrl ? (
                              <img
                                className={styles.playerAvatar}
                                src={player.profilePictureUrl}
                                alt={player.name}
                              />
                            ) : (
                              <div className={styles.playerAvatarFallback}>
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className={styles.playerMeta}>
                              <p className={styles.playerName}>{player.name}</p>
                              <p className={styles.playerStatus}>{status}</p>
                              {!isMatchFinished && isRoundFinished && (
                                <p className={styles.playerPoints}>
                                  +{roundPoints} pts
                                </p>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </aside>
                )}
              </div>

              {session?.gameOver && roomState?.pokemonName && (
                <div className={styles.revealTextBox}>
                  <p
                    className={`${styles.revealText} ${
                      session.ganado ? styles.revealTextWin : styles.revealTextLose
                    }`}
                  >
                    {session.ganado
                      ? `Correcto, era ${roomState.pokemonName.toUpperCase()}`
                      : `Te has quedado sin puntos de vida. Era ${roomState.pokemonName.toUpperCase()}`}
                  </p>
                </div>
              )}

              {!isRoundFinished && (
                <section className={styles.bottomPanel}>
                  <p className={styles.blockTitle}>ADIVINAR</p>
                  <div className={styles.actionsBox}>
                    <div
                      className={`${styles.inputRow} ${styles.inputRowLetter}`}
                      onClick={() => {
                        if (isPlaying && countdownRemaining <= 0 && !session?.gameOver) {
                          letterInputRef.current?.focus();
                        }
                      }}
                    >
                      <input
                        ref={letterInputRef}
                        className={`${styles.input} ${styles.letterInput}`}
                        type="text"
                        maxLength={1}
                        value={letter}
                        onChange={(event) => {
                          const next = sanitizeWordInput(
                            event.target.value,
                          ).slice(0, 1);
                          setLetter(next.toUpperCase());
                        }}
                        disabled={
                          !isPlaying || countdownRemaining > 0 || session?.gameOver
                        }
                        placeholder="_"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleGuessLetter();
                          }
                        }}
                      />
                      <button
                        className={`${styles.primaryBtn} ${styles.actionBtn}`}
                        type="button"
                        disabled={letterDisabled}
                        onClick={handleGuessLetter}
                      >
                        {letterCooldownMs > 0
                          ? `LETRA ${Math.ceil(letterCooldownMs / 1000)}`
                          : actionLoading === "guess-letter"
                            ? "..."
                            : "ADIVINAR LETRA"}
                      </button>
                    </div>

                    <div className={`${styles.inputRow} ${styles.inputRowWord}`}>
                      <input
                        className={styles.input}
                        type="text"
                        value={word}
                        onChange={(event) => setWord(event.target.value)}
                        disabled={
                          !isPlaying || countdownRemaining > 0 || session?.gameOver
                        }
                        placeholder="Palabra completa"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleGuessWord();
                          }
                        }}
                      />
                      <button
                        className={`${styles.secondaryBtn} ${styles.actionBtn}`}
                        type="button"
                        disabled={wordDisabled}
                        onClick={handleGuessWord}
                      >
                        {wordCooldownMs > 0
                          ? `PALABRA ${Math.ceil(wordCooldownMs / 1000)}`
                          : actionLoading === "guess-word"
                            ? "..."
                            : "ADIVINAR PALABRA"}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {isRoundFinished && (
                <section className={styles.resultsCard}>
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
                        <span className={styles.resultScore}>
                          +{player.roundPoints} pts
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.hostActions}>
                    <button
                      className={`${styles.primaryBtn} ${styles.btnFinishRed} ${styles.hostActionBtn}`}
                      type="button"
                      disabled={!isLeader || Boolean(actionLoading)}
                      onClick={onRepeatMode}
                    >
                      {actionLoading === "repeat" ? "..." : "REPETIR MODO"}
                    </button>
                    <button
                      className={`${styles.secondaryBtn} ${styles.btnFinishYellow} ${styles.hostActionBtn}`}
                      type="button"
                      disabled={!isLeader || Boolean(actionLoading)}
                      onClick={onChangeMode}
                    >
                      {actionLoading === "change-mode" ? "..." : "CAMBIAR MODO"}
                    </button>
                    <button
                      className={`${styles.dangerBtn} ${styles.btnFinishBlue} ${styles.hostActionBtn}`}
                      type="button"
                      disabled={!isLeader || Boolean(actionLoading)}
                      onClick={onFinishMatch}
                    >
                      {actionLoading === "finish-match" ? "..." : "TERMINAR PARTIDA"}
                    </button>
                  </div>
                  {!isLeader && (
                    <p className={styles.waitingText}>
                      Esperando a que el host decida el siguiente paso.
                    </p>
                  )}
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
                    <span className={styles.podiumName}>{player.name}</span>
                    <span className={styles.podiumScore}>{player.totalPoints} pts</span>
                  </article>
                ))}
              </div>
              <button
                className={styles.primaryBtn}
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
        </main>
      </div>
    </div>
  );
}

export default MultiplayerHangman;
