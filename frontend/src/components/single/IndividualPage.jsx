import { useEffect, useState } from "react";

import styles from "./IndividualPage.module.css";
import HangmanGame from "./HangmanGame";
import { getGlobalRanking } from "../../services/api";

function IndividualPage({ user, onGameStart, onGameEnd }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [globalRanking, setGlobalRanking] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    getGlobalRanking(user.id)
      .then(setGlobalRanking)
      .catch(() => {});
  }, [user?.id]);

  if (selectedGame === "hangman") {
    return (
      <div className={styles.gameWrapper}>
        <HangmanGame
          user={user}
          onGameStart={onGameStart}
          onGameEnd={onGameEnd}
          onChangeMinigame={() => setSelectedGame(null)}
          autoStart
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.singleLayout}>
        <div className={styles.mainPanel}>
          <div className={styles.header}>
            <p className={styles.welcome}>MINIJUEGOS INDIVIDUALES</p>
            <p className={styles.username}>{user.name}</p>
            <p className={styles.score}>{user.globalScore} PTS</p>
          </div>

          <div className={styles.cardsGrid}>
            <article className={styles.gameCard}>
              <h3 className={styles.cardTitle}>Ahorcado Pokemon</h3>
              <p className={styles.cardScore}>Score M1: {user.scoreM1} pts</p>
              <button
                className={styles.cardBtn}
                onClick={() => {
                  setSelectedGame("hangman");
                }}
              >
                Empezar
              </button>
            </article>
          </div>
        </div>

        <div className={styles.rankingPanel}>
          <p className={styles.rankingTitle}>TOP 15 GLOBAL</p>
          <div className={styles.rankingList}>
            {globalRanking.map((player) => {
              const isCurrentUser = player.id === user?.id;

              return (
                <div
                  key={player.id}
                  className={`${styles.rankingRow} ${isCurrentUser ? styles.rankingRowCurrentUser : ""}`}
                >
                  <span className={styles.rankingPos}>#{player.rank}</span>
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
                    {player.globalScore}
                  </span>
                </div>
              );
            })}
            {globalRanking.length === 0 && (
              <p className={styles.rankingEmpty}>Sin datos aun</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndividualPage;
