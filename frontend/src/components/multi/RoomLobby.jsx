import styles from "./RoomLobby.module.css";

function RoomLobby({
  currentUserId,
  roomCode,
  roomState,
  socketConnected,
  error,
  isExiting = false,
  orderedPlayers,
  minigames,
  myVotedMode,
  canManagePlayers,
  canStartRound,
  canFinishMatch,
  actionLoading,
  onVoteMode,
  onStartMode,
  onKickPlayer,
  onTransferLeader,
  onFinishMatch,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.lobbyShell}>
        <aside
          className={`${styles.usersPanel} ${isExiting ? styles.usersPanelExit : styles.usersPanelEnter}`}
        >
          <h3 className={styles.sectionTitle}>Jugadores</h3>
          <div className={styles.playersList}>
            {orderedPlayers.map((player) => (
              <article
                className={`${styles.playerCard} ${player.isLeader ? styles.playerCardLeader : ""}`}
                key={player.id}
              >
                {player.profilePictureUrl ? (
                  <img
                    className={styles.playerAvatar}
                    src={player.profilePictureUrl}
                    alt={`Avatar de ${player.name}`}
                  />
                ) : (
                  <div className={styles.playerAvatarFallback}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.playerInfo}>
                  <p className={styles.playerName}>
                    {player.name}
                  </p>
                  <p className={styles.playerScore}>{player.score} pts</p>
                  {player.isLeader && (
                    <span className={styles.leaderBadge}>Lider</span>
                  )}
                  {canManagePlayers && player.id !== currentUserId && (
                    <div className={styles.playerActions}>
                      <button
                        className={`${styles.iconBtn} ${styles.leaderBtn}`}
                        type="button"
                        disabled={Boolean(actionLoading)}
                        title="Dar liderazgo"
                        onClick={() =>
                          onTransferLeader({
                            id: player.id,
                            name: player.name,
                          })
                        }
                      >
                        {actionLoading === `leader:${player.id}` ? "..." : "♛"}
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.kickBtn}`}
                        type="button"
                        disabled={Boolean(actionLoading)}
                        title="Expulsar"
                        onClick={() =>
                          onKickPlayer({
                            id: player.id,
                            name: player.name,
                          })
                        }
                      >
                        {actionLoading === `kick:${player.id}` ? "..." : "✕"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </aside>

        <div
          className={`${styles.mainPanel} ${isExiting ? styles.mainPanelExit : styles.mainPanelEnter}`}
        >
          <div className={styles.lobbyTop}>
            <div>
              <p className={styles.welcome}>MODO MULTIJUGADOR</p>
              <p className={styles.roomMeta}>
                Sala <strong>{roomCode}</strong> | Estado: {roomState.state}
              </p>
            </div>
            <div className={styles.connectionTag}>
              {socketConnected ? "Conectado" : "Sin conexion"}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <section className={styles.gamesColumn}>
            <div className={styles.gamesHeader}>
              <h3 className={styles.sectionTitle}>Minijuegos</h3>
              {canFinishMatch && (
                <button
                  className={`${styles.actionBtn} ${styles.finishBtn}`}
                  type="button"
                  disabled={Boolean(actionLoading)}
                  onClick={onFinishMatch}
                >
                  {actionLoading === "finish-match"
                    ? "Terminando..."
                    : "Terminar partida"}
                </button>
              )}
            </div>
            <div className={styles.gamesGrid}>
              {minigames.map((game) => (
                <article
                  className={`${styles.gameCard} ${roomState?.gameMode === game.key ? styles.gameCardActive : ""}`}
                  key={game.key}
                >
                  <p className={styles.gameTitle}>{game.title}</p>
                  <p className={styles.gameDesc}>{game.desc}</p>
                  <p className={styles.voteCount}>
                    Votos: {roomState?.modeVotes?.[game.key] ?? 0}
                  </p>
                  {canStartRound && (
                    <button
                      className={styles.startBtn}
                      type="button"
                      disabled={
                        Boolean(actionLoading) ||
                        roomState.state !== "WAITING" ||
                        orderedPlayers.length < 2
                      }
                      onClick={() => onStartMode(game.key)}
                    >
                      {actionLoading === `start:${game.key}`
                        ? "Iniciando..."
                        : orderedPlayers.length < 2
                          ? "Min. 2 jugadores"
                          : "Iniciar"}
                    </button>
                  )}
                  <button
                    className={styles.voteBtn}
                    type="button"
                    disabled={
                      Boolean(actionLoading) || roomState.state !== "WAITING"
                    }
                    onClick={() => onVoteMode(game.key)}
                  >
                    {actionLoading === `vote:${game.key}`
                      ? "Votando..."
                      : myVotedMode === game.key
                        ? "Tu voto"
                        : myVotedMode
                          ? "Cambiar voto"
                          : "Votar"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default RoomLobby;
