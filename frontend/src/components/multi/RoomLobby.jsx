import styles from "./RoomLobby.module.css";

function RoomLobby({
  currentUserId,
  roomCode,
  roomState,
  socketConnected,
  info,
  error,
  orderedPlayers,
  minigames,
  myVotedMode,
  canManagePlayers,
  actionLoading,
  onVoteMode,
  onKickPlayer,
  onTransferLeader,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.lobbyShell}>
        <aside className={styles.usersPanel}>
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
                        className={styles.manageBtn}
                        type="button"
                        disabled={Boolean(actionLoading)}
                        onClick={() => onTransferLeader(player.id)}
                      >
                        {actionLoading === `leader:${player.id}`
                          ? "Transfiriendo..."
                          : "Dar liderazgo"}
                      </button>
                      <button
                        className={`${styles.manageBtn} ${styles.kickBtn}`}
                        type="button"
                        disabled={Boolean(actionLoading)}
                        onClick={() => onKickPlayer(player.id)}
                      >
                        {actionLoading === `kick:${player.id}`
                          ? "Expulsando..."
                          : "Expulsar"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </aside>

        <div className={styles.mainPanel}>
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

          {info && <p className={styles.info}>{info}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <section className={styles.gamesColumn}>
            <h3 className={styles.sectionTitle}>Minijuegos</h3>
            <div className={styles.gamesGrid}>
              {minigames.map((game) => (
                <article className={styles.gameCard} key={game.key}>
                  <p className={styles.gameTitle}>{game.title}</p>
                  <p className={styles.gameDesc}>{game.desc}</p>
                  <p className={styles.voteCount}>
                    Votos: {roomState?.modeVotes?.[game.key] ?? 0}
                  </p>
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
