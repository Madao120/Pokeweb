import styles from "./MultiplayerPage.module.css";
import MultiplayerHangman from "./MultiplayerHangman";
import RoomLobby from "./RoomLobby";

import { useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";
import {
  buildApiUrl,
  changeMultiplayerMode,
  createMultiplayerRoom,
  finishMultiplayerGame,
  getMultiplayerRoomState,
  getUser,
  guessMultiplayerLetter,
  guessMultiplayerWord,
  joinMultiplayerRoom,
  kickMultiplayerPlayer,
  repeatMultiplayerRound,
  startMultiplayerRound,
  transferMultiplayerLeader,
  voteMultiplayerMode,
} from "../../services/api";

const MINIGAMES = [
  {
    key: "HANGMAN",
    title: "Ahorcado",
    desc: "Todos reciben el mismo Pokemon y compiten por terminar antes.",
    available: true,
  },
  {
    key: "GUESS_SOUND",
    title: "GuessSound",
    desc: "Modo en preparacion para reglas multiplayer.",
    available: true,
  },
  {
    key: "GUESS_SPRITE",
    title: "GuessSprite",
    desc: "Modo en preparacion para reglas multiplayer.",
    available: true,
  },
];

const STEP_ORDER = {
  home: 0,
  create: 1,
  join: 2,
};

const STEP_TRANSITION_MS = 320;
const LOBBY_EXIT_MS = 300;

function mapJoinError(message) {
  if (message?.includes("ROOM_NOT_FOUND")) return "No se ha encontrado la sala";
  if (message?.includes("WRONG_PASSWORD")) return "Contrasena incorrecta";
  if (message?.includes("ALREADY_VOTED_MODE")) return "Ya habias votado un modo.";
  if (message?.includes("NOT_LEADER")) return "Solo el lider puede hacer esta accion.";
  if (message?.includes("ROOM_NOT_WAITING")) return "Esta accion solo se permite en la sala de espera.";
  if (message?.includes("ROOM_NOT_PLAYING")) return "La ronda no esta activa ahora mismo.";
  if (message?.includes("ROUND_NOT_FINISHED")) return "La ronda actual aun no ha terminado.";
  if (message?.includes("NOT_ENOUGH_PLAYERS")) return "Se necesitan al menos 2 jugadores.";
  if (message?.includes("ROUND_COUNTDOWN_ACTIVE")) return "La ronda esta a punto de empezar.";
  if (message?.includes("CANNOT_FINISH_NOW")) return "Ahora no se puede terminar la partida.";
  if (message?.includes("WS_CONNECTION_ERROR")) {
    return "No se ha podido establecer conexion";
  }
  return message || "No se ha podido establecer conexion";
}

function stampRoomState(nextState, previousState, preservePersonal) {
  const stamped = {
    ...(nextState || {}),
    _syncedAt: Date.now(),
  };

  if (preservePersonal) return stamped;

  return {
    ...stamped,
    mySession: previousState?.mySession,
    pokemonName: previousState?.pokemonName,
    pokemonType1: previousState?.pokemonType1,
    pokemonType2: previousState?.pokemonType2,
    pokemonGeneration: previousState?.pokemonGeneration,
  };
}

function MultiplayerPage({ user }) {
  const [step, setStep] = useState("home");
  const [createPassword, setCreatePassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomState, setRoomState] = useState(null);
  const [playerDetails, setPlayerDetails] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [wasKicked, setWasKicked] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [hasCompletedAnyRound, setHasCompletedAnyRound] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [displayStep, setDisplayStep] = useState("home");
  const [stepPhase, setStepPhase] = useState("idle");
  const [stepDirection, setStepDirection] = useState("right");
  const [renderLobbyState, setRenderLobbyState] = useState(null);
  const [isLobbyExiting, setIsLobbyExiting] = useState(false);

  const clientRef = useRef(null);
  const stepRef = useRef(step);
  const leaderIdRef = useRef(null);
  const stepTransitionTimerRef = useRef(null);
  const lobbyTransitionTimerRef = useRef(null);
  const menuExitTimerRef = useRef(null);

  const sameId = (a, b) => String(a) === String(b);
  const roomCode = roomState?.roomCode || "";

  const orderedPlayers = useMemo(() => {
    if (!roomState?.playerIds) return [];
    return roomState.playerIds.map((playerId) => {
      const detail = playerDetails[playerId];
      const score = roomState?.roundScores?.[playerId] ?? 0;
      return {
        id: playerId,
        name: detail?.name || `Jugador ${playerId}`,
        profilePictureUrl: detail?.profilePictureUrl || "",
        score,
        isLeader: sameId(roomState?.leaderId, playerId),
      };
    });
  }, [playerDetails, roomState]);

  const myVotedMode = roomState?.playerModeVotes?.[user.id] || null;
  const canManagePlayers =
    sameId(roomState?.leaderId, user.id) && roomState?.state === "WAITING";
  const canStartRound =
    sameId(roomState?.leaderId, user.id) && roomState?.state === "WAITING";

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    setPanelVisible(false);
    const frameId = window.requestAnimationFrame(() => {
      setPanelVisible(true);
      setStepPhase("enter");
      stepTransitionTimerRef.current = window.setTimeout(() => {
        setStepPhase("idle");
      }, STEP_TRANSITION_MS);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    return () => {
      if (stepTransitionTimerRef.current) {
        window.clearTimeout(stepTransitionTimerRef.current);
      }
      if (lobbyTransitionTimerRef.current) {
        window.clearTimeout(lobbyTransitionTimerRef.current);
      }
      if (menuExitTimerRef.current) {
        window.clearTimeout(menuExitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!roomState?.playerIds?.length) return undefined;
    let cancelled = false;

    const loadPlayers = async () => {
      try {
        const idsMissing = roomState.playerIds.filter((id) => !playerDetails[id]);
        if (!idsMissing.length) return;

        const users = await Promise.all(idsMissing.map((id) => getUser(id)));
        if (cancelled) return;

        setPlayerDetails((prev) => {
          const next = { ...prev };
          users.forEach((player) => {
            next[player.id] = player;
          });
          return next;
        });
      } catch {
        if (!cancelled) {
          setError("No se han podido cargar todos los datos de jugadores.");
        }
      }
    };

    loadPlayers();
    return () => {
      cancelled = true;
    };
  }, [playerDetails, roomState?.playerIds]);

  useEffect(() => {
    return () => {
      clientRef.current?.deactivate();
    };
  }, []);

  useEffect(() => {
    if (
      roomState?.state === "ROUND_FINISHED" ||
      roomState?.state === "FINISHED"
    ) {
      setHasCompletedAnyRound(true);
    }
  }, [roomState?.state]);

  useEffect(() => {
    window.__MULTI_SHOULD_CONFIRM_EXIT = Boolean(roomState);
    return () => {
      window.__MULTI_SHOULD_CONFIRM_EXIT = false;
    };
  }, [roomState]);

  useEffect(() => {
    const handleAnimatedReturn = (event) => {
      if (roomState) return;
      if (event?.detail?.fromMultiplayerAnimatedExit) return;

      event?.preventDefault?.();
      setPanelVisible(false);
      setStepPhase("exit");

      menuExitTimerRef.current = window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("returnToModeMenu", {
            detail: {
              skipDelay: true,
              skipMultiplayerConfirm: true,
              fromMultiplayerAnimatedExit: true,
            },
          }),
        );
      }, STEP_TRANSITION_MS);
    };

    window.addEventListener("returnToModeMenu", handleAnimatedReturn);
    return () => {
      window.removeEventListener("returnToModeMenu", handleAnimatedReturn);
    };
  }, [roomState]);

  const handleKicked = () => {
    if (wasKicked) return;
    clientRef.current?.deactivate();
    setSocketConnected(false);
    setWasKicked(true);
  };

  const applyRoomState = (nextState, preservePersonal = false) => {
    setRoomState((previousState) => {
      const resolvedState = stampRoomState(nextState, previousState, preservePersonal);
      const leaderChanged =
        leaderIdRef.current !== null &&
        !sameId(leaderIdRef.current, resolvedState?.leaderId);

      leaderIdRef.current = resolvedState?.leaderId ?? null;

      if (stepRef.current === "lobby") {
        const isStillInRoom = (resolvedState?.playerIds || []).some((pid) =>
          sameId(pid, user.id),
        );
        if (!isStillInRoom) {
          handleKicked();
          return resolvedState;
        }

        if (leaderChanged && resolvedState?.roomCode) {
          getMultiplayerRoomState(resolvedState.roomCode, user.id)
            .then((freshState) => {
              setRoomState((prev) => stampRoomState(freshState, prev, true));
            })
            .catch(() => {});
        }
      }

      return resolvedState;
    });
  };

  const connectRoomSocket = (code, userId) =>
    new Promise((resolve, reject) => {
      const normalizedCode = String(code || "").trim();
      const wsEndpoint = buildApiUrl("/ws");
      let settled = false;
      let timeoutId = null;

      const client = new Client({
        webSocketFactory: () => new SockJS(wsEndpoint),
        reconnectDelay: 2500,
        onConnect: () => {
          if (timeoutId) window.clearTimeout(timeoutId);
          if (settled) return;
          settled = true;
          setSocketConnected(true);

          client.subscribe(`/topic/room/${normalizedCode}`, (frame) => {
            try {
              applyRoomState(JSON.parse(frame.body), false);
            } catch {
              setError("Se ha recibido una actualizacion invalida de la sala.");
            }
          });

          client.subscribe(
            `/topic/room/${normalizedCode}/player/${userId}`,
            (frame) => {
              try {
                applyRoomState(JSON.parse(frame.body), true);
              } catch {
                setError("Se ha recibido una actualizacion invalida del jugador.");
              }
            },
          );

          resolve(client);
        },
        onStompError: () => {
          if (timeoutId) window.clearTimeout(timeoutId);
          setSocketConnected(false);
          if (!settled) {
            settled = true;
            reject(new Error("WS_CONNECTION_ERROR"));
          }
        },
        onWebSocketError: () => {
          if (timeoutId) window.clearTimeout(timeoutId);
          setSocketConnected(false);
          if (!settled) {
            settled = true;
            reject(new Error("WS_CONNECTION_ERROR"));
          }
        },
        onWebSocketClose: () => {
          setSocketConnected(false);
        },
      });

      timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        client.deactivate();
        setSocketConnected(false);
        reject(new Error("WS_CONNECTION_ERROR"));
      }, 7000);

      client.activate();
      clientRef.current = client;
    });

  const enterLobby = async (nextRoomState) => {
    clientRef.current?.deactivate();
    setWasKicked(false);
    setStep("lobby");
    setError("");

    await connectRoomSocket(nextRoomState.roomCode, user.id);
    applyRoomState(nextRoomState, true);

    const latestState = await getMultiplayerRoomState(nextRoomState.roomCode, user.id);
    applyRoomState(latestState, true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^\d{3,}$/.test(createPassword)) {
      setError("La contrasena de sala debe tener minimo 3 digitos numericos.");
      return;
    }

    setLoading(true);
    try {
      const state = await createMultiplayerRoom(user.id, createPassword);
      await enterLobby(state);
      setCreatePassword("");
      setHasCompletedAnyRound(false);
    } catch (err) {
      setError(mapJoinError(err.message));
      setStep("create");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedCode = joinCode.replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("El codigo de sala debe tener 6 digitos.");
      return;
    }
    if (!/^\d{3,}$/.test(joinPassword)) {
      setError("La contrasena de sala debe tener minimo 3 digitos numericos.");
      return;
    }

    setLoading(true);
    try {
      const state = await joinMultiplayerRoom(normalizedCode, user.id, joinPassword);
      await enterLobby(state);
      setJoinCode("");
      setJoinPassword("");
      setHasCompletedAnyRound(false);
    } catch (err) {
      setError(mapJoinError(err.message));
      setStep("join");
    } finally {
      setLoading(false);
    }
  };

  const handleVoteMode = async (mode) => {
    if (!roomState?.roomCode || !mode) return;
    setError("");
    setActionLoading(`vote:${mode}`);
    try {
      const updated = await voteMultiplayerMode(roomState.roomCode, user.id, mode);
      applyRoomState(updated, true);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const handleStartMode = async (mode) => {
    if (!roomState?.roomCode) return;
    setError("");
    setActionLoading(`start:${mode}`);
    try {
      const updated = await startMultiplayerRound(roomState.roomCode, user.id, mode);
      applyRoomState(updated, true);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const executeKickPlayer = async (targetPlayer) => {
    if (!roomState?.roomCode) return;
    setError("");
    setActionLoading(`kick:${targetPlayer.id}`);
    try {
      const updated = await kickMultiplayerPlayer(
        roomState.roomCode,
        user.id,
        targetPlayer.id,
      );
      applyRoomState(updated, true);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const executeTransferLeader = async (newLeader) => {
    if (!roomState?.roomCode) return;
    setError("");
    setActionLoading(`leader:${newLeader.id}`);
    try {
      const updated = await transferMultiplayerLeader(
        roomState.roomCode,
        user.id,
        newLeader.id,
      );
      applyRoomState(updated, true);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const handleKickPlayer = (targetPlayer) => {
    setConfirmDialog({
      title: "Confirmar expulsion",
      message: `Estas seguro que quieres expulsar a ${targetPlayer.name}?`,
      onConfirm: () => executeKickPlayer(targetPlayer),
    });
  };

  const handleTransferLeader = (newLeader) => {
    setConfirmDialog({
      title: "Confirmar liderazgo",
      message: `Estas seguro que quieres darle el liderazgo a ${newLeader.name}?`,
      onConfirm: () => executeTransferLeader(newLeader),
    });
  };

  const handleGuessLetter = async (letra) => {
    setActionLoading("guess-letter");
    setError("");
    try {
      const updated = await guessMultiplayerLetter(roomState.roomCode, user.id, letra);
      applyRoomState(updated, true);
      return updated;
    } catch (err) {
      const message = mapJoinError(err.message);
      setError(message);
      throw new Error(message);
    } finally {
      setActionLoading("");
    }
  };

  const handleGuessWord = async (palabra) => {
    setActionLoading("guess-word");
    setError("");
    try {
      const updated = await guessMultiplayerWord(roomState.roomCode, user.id, palabra);
      applyRoomState(updated, true);
      return updated;
    } catch (err) {
      const message = mapJoinError(err.message);
      setError(message);
      throw new Error(message);
    } finally {
      setActionLoading("");
    }
  };

  const handleRepeatMode = async () => {
    setActionLoading("repeat");
    setError("");
    try {
      const updated = await repeatMultiplayerRound(roomState.roomCode, user.id);
      applyRoomState(updated, true);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const handleChangeMode = async () => {
    setActionLoading("change-mode");
    setError("");
    try {
      const updated = await changeMultiplayerMode(roomState.roomCode, user.id);
      applyRoomState(updated, true);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const handleFinishMatch = async () => {
    setActionLoading("finish-match");
    setError("");
    try {
      const updated = await finishMultiplayerGame(roomState.roomCode, user.id);
      applyRoomState(updated, true);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const handleRefreshState = async () => {
    if (!roomState?.roomCode) return;
    try {
      const updated = await getMultiplayerRoomState(roomState.roomCode, user.id);
      applyRoomState(updated, true);
    } catch (err) {
      setError(mapJoinError(err.message));
    }
  };

  const transitionToStep = (nextStep) => {
    if (nextStep === stepRef.current && nextStep === displayStep) return;

    const currentOrder = STEP_ORDER[stepRef.current] ?? 0;
    const nextOrder = STEP_ORDER[nextStep] ?? 0;
    const direction = nextOrder >= currentOrder ? "right" : "left";

    if (stepTransitionTimerRef.current) {
      window.clearTimeout(stepTransitionTimerRef.current);
    }

    setStepDirection(direction);
    setStepPhase("exit");

    stepTransitionTimerRef.current = window.setTimeout(() => {
      setStep(nextStep);
      setDisplayStep(nextStep);
      setStepPhase("enter");

      stepTransitionTimerRef.current = window.setTimeout(() => {
        setStepPhase("idle");
      }, STEP_TRANSITION_MS);
    }, STEP_TRANSITION_MS);
  };

  if (wasKicked) {
    return (
      <div className={styles.page}>
        <div className={styles.mainPanel}>
          <div className={styles.header}>
            <p className={styles.welcome}>MODO MULTIJUGADOR</p>
            <p className={styles.subtitle}>Has sido expulsado de la sala</p>
          </div>
          <div className={styles.kickedBox}>
            <p className={styles.kickedText}>El lider de la sala te ha expulsado.</p>
            <button
              className={styles.optionBtn}
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("returnToModeMenu", {
                    detail: { skipDelay: true, skipMultiplayerConfirm: true },
                  }),
                )
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shouldRenderHangman =
    roomState &&
    roomState.gameMode === "HANGMAN" &&
    ["PLAYING", "ROUND_FINISHED", "FINISHED"].includes(roomState.state);

  useEffect(() => {
    if (step !== "lobby") {
      setRenderLobbyState(null);
      setIsLobbyExiting(false);
      if (lobbyTransitionTimerRef.current) {
        window.clearTimeout(lobbyTransitionTimerRef.current);
      }
      return;
    }

    if (roomState && !shouldRenderHangman) {
      if (lobbyTransitionTimerRef.current) {
        window.clearTimeout(lobbyTransitionTimerRef.current);
      }
      setRenderLobbyState(roomState);
      setIsLobbyExiting(false);
      return;
    }

    if (renderLobbyState && shouldRenderHangman && !isLobbyExiting) {
      setIsLobbyExiting(true);
      lobbyTransitionTimerRef.current = window.setTimeout(() => {
        setRenderLobbyState(null);
        setIsLobbyExiting(false);
      }, LOBBY_EXIT_MS);
    }
  }, [step, roomState, shouldRenderHangman, renderLobbyState, isLobbyExiting]);

  if (step === "lobby" && roomState && shouldRenderHangman) {
    if (renderLobbyState) {
      return (
        <RoomLobby
          currentUserId={user.id}
          roomCode={renderLobbyState.roomCode}
          roomState={renderLobbyState}
          socketConnected={socketConnected}
          error={error}
          isExiting
          orderedPlayers={orderedPlayers}
          minigames={MINIGAMES}
          myVotedMode={renderLobbyState?.playerModeVotes?.[user.id] || null}
          canManagePlayers={canManagePlayers}
          canStartRound={canStartRound}
          canFinishMatch={
            sameId(renderLobbyState?.leaderId, user.id) &&
            renderLobbyState?.state === "WAITING" &&
            hasCompletedAnyRound
          }
          actionLoading={actionLoading}
          onVoteMode={handleVoteMode}
          onStartMode={handleStartMode}
          onKickPlayer={handleKickPlayer}
          onTransferLeader={handleTransferLeader}
          onFinishMatch={handleFinishMatch}
        />
      );
    }
    return (
      <MultiplayerHangman
        user={user}
        roomState={roomState}
        orderedPlayers={orderedPlayers}
        socketConnected={socketConnected}
        actionLoading={actionLoading}
        onGuessLetter={handleGuessLetter}
        onGuessWord={handleGuessWord}
        onRepeatMode={handleRepeatMode}
        onChangeMode={handleChangeMode}
        onFinishMatch={handleFinishMatch}
        onRefreshState={handleRefreshState}
      />
    );
  }

  if (step === "lobby" && renderLobbyState) {
    return (
      <>
        <RoomLobby
          currentUserId={user.id}
          roomCode={renderLobbyState.roomCode}
          roomState={renderLobbyState}
          socketConnected={socketConnected}
          error={error}
          isExiting={isLobbyExiting}
          orderedPlayers={orderedPlayers}
          minigames={MINIGAMES}
          myVotedMode={renderLobbyState?.playerModeVotes?.[user.id] || null}
          canManagePlayers={canManagePlayers}
          canStartRound={canStartRound}
          canFinishMatch={
            sameId(renderLobbyState?.leaderId, user.id) &&
            renderLobbyState?.state === "WAITING" &&
            hasCompletedAnyRound
          }
          actionLoading={actionLoading}
          onVoteMode={handleVoteMode}
          onStartMode={handleStartMode}
          onKickPlayer={handleKickPlayer}
          onTransferLeader={handleTransferLeader}
          onFinishMatch={handleFinishMatch}
        />
        {confirmDialog && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmBox}>
              <p className={styles.confirmTitle}>{confirmDialog.title}</p>
              <p className={styles.confirmText}>{confirmDialog.message}</p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.optionBtnGhost}
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                >
                  Cancelar
                </button>
                <button
                  className={styles.optionBtn}
                  type="button"
                  onClick={async () => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await action();
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={styles.page}>
      <div
        className={`${styles.mainPanel} ${panelVisible ? styles.mainPanelVisible : ""}`}
      >
        <div className={styles.header}>
          <p className={styles.welcome}>MODO MULTIJUGADOR</p>
          <p className={styles.subtitle}>Crea una sala o unete con codigo y contrasena</p>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {displayStep === "create" && (
          <form
            className={`${styles.formCard} ${styles.transitionItem} ${stepPhase === "enter" ? styles.transitionEnter : ""} ${stepPhase === "exit" ? styles.transitionExit : ""} ${stepPhase !== "idle" ? (stepDirection === "left" ? styles.transitionFromLeft : styles.transitionFromRight) : ""}`}
            onSubmit={handleCreate}
          >
            <h3 className={styles.optionTitle}>Crear sala</h3>
            <p className={styles.optionText}>
              Debes poner una contrasena numerica de al menos 3 digitos.
            </p>
            <input
              className={styles.input}
              type="password"
              inputMode="numeric"
              pattern="\d*"
              maxLength={12}
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value.replace(/\D/g, ""))}
              placeholder="Contrasena de sala"
              required
            />
            <div className={styles.formActions}>
              <button
                className={styles.optionBtnGhost}
                type="button"
                onClick={() => {
                  setError("");
                  transitionToStep("home");
                }}
              >
                Volver
              </button>
              <button className={styles.optionBtn} type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear sala"}
              </button>
            </div>
          </form>
        )}

        {displayStep === "join" && (
          <form
            className={`${styles.formCard} ${styles.transitionItem} ${stepPhase === "enter" ? styles.transitionEnter : ""} ${stepPhase === "exit" ? styles.transitionExit : ""} ${stepPhase !== "idle" ? (stepDirection === "left" ? styles.transitionFromLeft : styles.transitionFromRight) : ""}`}
            onSubmit={handleJoin}
          >
            <h3 className={styles.optionTitle}>Unirse a sala</h3>
            <p className={styles.optionText}>
              Introduce el codigo de 6 digitos y la contrasena de la sala.
            </p>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Codigo de sala"
              required
            />
            <input
              className={styles.input}
              type="password"
              inputMode="numeric"
              pattern="\d*"
              maxLength={12}
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="Contrasena de sala"
              required
            />
            <div className={styles.formActions}>
              <button
                className={styles.optionBtnGhost}
                type="button"
                onClick={() => {
                  setError("");
                  transitionToStep("home");
                }}
              >
                Volver
              </button>
              <button className={styles.optionBtn} type="submit" disabled={loading}>
                {loading ? "Uniendo..." : "Unirse"}
              </button>
            </div>
          </form>
        )}

        {displayStep === "home" && (
          <div className={styles.optionPanel}>
            <article
              className={`${styles.optionCard} ${styles.optionCardCreate} ${styles.transitionItem} ${stepPhase === "enter" ? styles.transitionEnter : ""} ${stepPhase === "exit" ? styles.transitionExit : ""}`}
            >
              <h3 className={styles.optionTitle}>Crear sala</h3>
              <p className={styles.optionText}>
                Genera un codigo automatico de 6 digitos y protege la sala.
              </p>
              <button
                className={styles.optionBtn}
                type="button"
                onClick={() => {
                  setError("");
                  transitionToStep("create");
                }}
              >
                Crear
              </button>
            </article>

            <article
              className={`${styles.optionCard} ${styles.optionCardJoin} ${styles.transitionItem} ${stepPhase === "enter" ? styles.transitionEnter : ""} ${stepPhase === "exit" ? styles.transitionExit : ""}`}
            >
              <h3 className={styles.optionTitle}>Unirse a sala</h3>
              <p className={styles.optionText}>
                Entra a una sala existente con su codigo y contrasena.
              </p>
              <button
                className={styles.optionBtn}
                type="button"
                onClick={() => {
                  setError("");
                  transitionToStep("join");
                }}
              >
                Unirse
              </button>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiplayerPage;
