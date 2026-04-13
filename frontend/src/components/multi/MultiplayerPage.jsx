import styles from "./MultiplayerPage.module.css";
import RoomLobby from "./RoomLobby";

import { useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";
import {
  buildApiUrl,
  createMultiplayerRoom,
  getMultiplayerRoomState,
  getUser,
  joinMultiplayerRoom,
  kickMultiplayerPlayer,
  transferMultiplayerLeader,
  voteMultiplayerMode,
} from "../../services/api";

const MINIGAMES = [
  {
    key: "HANGMAN",
    title: "Ahorcado",
    desc: "Primera fase disponible para lobby multiplayer.",
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

function mapJoinError(message) {
  if (message?.includes("ROOM_NOT_FOUND")) return "No se ha encontrado la sala";
  if (message?.includes("WRONG_PASSWORD")) return "Contrasena incorrecta";
  if (message?.includes("ALREADY_VOTED_MODE")) return "Ya has votado un modo de juego.";
  if (message?.includes("NOT_LEADER")) return "Solo el lider puede hacer esta accion.";
  if (message?.includes("ROOM_NOT_WAITING")) return "Esta accion solo se permite en la sala de espera.";
  if (message?.includes("WS_CONNECTION_ERROR")) {
    return "No se ha podido establecer conexion";
  }
  return message || "No se ha podido establecer conexion";
}

function MultiplayerPage({ user }) {
  const [step, setStep] = useState("home");
  const [createPassword, setCreatePassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [roomState, setRoomState] = useState(null);
  const [playerDetails, setPlayerDetails] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [wasKicked, setWasKicked] = useState(false);

  const clientRef = useRef(null);
  const stepRef = useRef(step);

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
        isLeader: roomState?.leaderId === playerId,
      };
    });
  }, [playerDetails, roomState]);

  const myVotedMode = roomState?.playerModeVotes?.[user.id] || null;
  const canManagePlayers = roomState?.leaderId === user.id && roomState?.state === "WAITING";

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!roomState?.playerIds?.length) return undefined;
    let cancelled = false;

    const loadPlayers = async () => {
      try {
        const idsMissing = roomState.playerIds.filter(
          (id) => !playerDetails[id],
        );
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
          setInfo("No se han podido cargar todos los datos de jugadores.");
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

  const handleKicked = () => {
    if (wasKicked) return;
    clientRef.current?.deactivate();
    setSocketConnected(false);
    setWasKicked(true);
  };

  const applyRoomState = (nextState) => {
    setRoomState(nextState);
    if (stepRef.current !== "lobby") return;
    const isStillInRoom = (nextState?.playerIds || []).includes(user.id);
    if (!isStillInRoom) {
      handleKicked();
    }
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
              applyRoomState(JSON.parse(frame.body));
            } catch {
              setInfo("Se ha recibido una actualizacion invalida de la sala.");
            }
          });

          client.subscribe(
            `/topic/room/${normalizedCode}/player/${userId}`,
            (frame) => {
              try {
                applyRoomState(JSON.parse(frame.body));
              } catch {
                setInfo(
                  "Se ha recibido una actualizacion invalida del jugador.",
                );
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
    applyRoomState(nextRoomState);
    setStep("lobby");
    setInfo("");
    setError("");

    await connectRoomSocket(nextRoomState.roomCode, user.id);

    const latestState = await getMultiplayerRoomState(
      nextRoomState.roomCode,
      user.id,
    );
    applyRoomState(latestState);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!/^\d{3,}$/.test(createPassword)) {
      setError("La contrasena de sala debe tener minimo 3 digitos numericos.");
      return;
    }

    setLoading(true);
    try {
      const state = await createMultiplayerRoom(user.id, createPassword);
      await enterLobby(state);
      setInfo("");
      setCreatePassword("");
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
    setInfo("");

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
      const state = await joinMultiplayerRoom(
        normalizedCode,
        user.id,
        joinPassword,
      );
      await enterLobby(state);
      setInfo(`Te has unido a la sala ${state.roomCode}`);
      setJoinCode("");
      setJoinPassword("");
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
    setInfo("");
    setActionLoading(`vote:${mode}`);
    try {
      const hadPreviousVote = Boolean(myVotedMode);
      const updated = await voteMultiplayerMode(roomState.roomCode, user.id, mode);
      applyRoomState(updated);
      setInfo(hadPreviousVote ? `Voto actualizado a ${mode}.` : `Voto registrado para ${mode}.`);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const handleKickPlayer = async (targetPlayer) => {
    if (!roomState?.roomCode) return;
    const confirmKick = window.confirm(
      `Estas seguro que quieres expulsar a ${targetPlayer.name}?`,
    );
    if (!confirmKick) return;

    setError("");
    setInfo("");
    setActionLoading(`kick:${targetPlayer.id}`);
    try {
      const updated = await kickMultiplayerPlayer(
        roomState.roomCode,
        user.id,
        targetPlayer.id,
      );
      applyRoomState(updated);
      setInfo(`${targetPlayer.name} ha sido expulsado de la sala.`);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
  };

  const handleTransferLeader = async (newLeader) => {
    if (!roomState?.roomCode) return;
    const confirmLeader = window.confirm(
      `Estas seguro que quieres darle el liderazgo a ${newLeader.name}?`,
    );
    if (!confirmLeader) return;

    setError("");
    setInfo("");
    setActionLoading(`leader:${newLeader.id}`);
    try {
      const updated = await transferMultiplayerLeader(
        roomState.roomCode,
        user.id,
        newLeader.id,
      );
      applyRoomState(updated);
      setInfo(`${newLeader.name} es ahora el lider de la sala.`);
    } catch (err) {
      setError(mapJoinError(err.message));
    } finally {
      setActionLoading("");
    }
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
            <p className={styles.kickedText}>
              El lider de la sala te ha expulsado.
            </p>
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

  if (step === "lobby" && roomState) {
    return (
      <RoomLobby
        currentUserId={user.id}
        roomCode={roomCode}
        roomState={roomState}
        socketConnected={socketConnected}
        info={info}
        error={error}
        orderedPlayers={orderedPlayers}
        minigames={MINIGAMES}
        myVotedMode={myVotedMode}
        canManagePlayers={canManagePlayers}
        actionLoading={actionLoading}
        onVoteMode={handleVoteMode}
        onKickPlayer={handleKickPlayer}
        onTransferLeader={handleTransferLeader}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.mainPanel}>
        <div className={styles.header}>
          <p className={styles.welcome}>MODO MULTIJUGADOR</p>
          <p className={styles.subtitle}>
            Crea una sala o unete con codigo y contrasena
          </p>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {info && <p className={styles.info}>{info}</p>}

        {step === "create" && (
          <form className={styles.formCard} onSubmit={handleCreate}>
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
              onChange={(e) =>
                setCreatePassword(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Contrasena de sala"
              required
            />
            <div className={styles.formActions}>
              <button
                className={styles.optionBtnGhost}
                type="button"
                onClick={() => {
                  setStep("home");
                  setError("");
                }}
              >
                Volver
              </button>
              <button
                className={styles.optionBtn}
                type="submit"
                disabled={loading}
              >
                {loading ? "Creando..." : "Crear sala"}
              </button>
            </div>
          </form>
        )}

        {step === "join" && (
          <form className={styles.formCard} onSubmit={handleJoin}>
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
              onChange={(e) =>
                setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
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
              onChange={(e) =>
                setJoinPassword(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Contrasena de sala"
              required
            />
            <div className={styles.formActions}>
              <button
                className={styles.optionBtnGhost}
                type="button"
                onClick={() => {
                  setStep("home");
                  setError("");
                }}
              >
                Volver
              </button>
              <button
                className={styles.optionBtn}
                type="submit"
                disabled={loading}
              >
                {loading ? "Uniendo..." : "Unirse"}
              </button>
            </div>
          </form>
        )}

        {step === "home" && (
          <div className={styles.optionPanel}>
            <article className={styles.optionCard}>
              <h3 className={styles.optionTitle}>Crear sala</h3>
              <p className={styles.optionText}>
                Genera un codigo automatico de 6 digitos y protege la sala.
              </p>
              <button
                className={styles.optionBtn}
                type="button"
                onClick={() => {
                  setError("");
                  setInfo("");
                  setStep("create");
                }}
              >
                Crear
              </button>
            </article>

            <article className={styles.optionCard}>
              <h3 className={styles.optionTitle}>Unirse a sala</h3>
              <p className={styles.optionText}>
                Entra a una sala existente con su codigo y contrasena.
              </p>
              <button
                className={styles.optionBtn}
                type="button"
                onClick={() => {
                  setError("");
                  setInfo("");
                  setStep("join");
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
