import { useEffect, useState } from "react";

import styles from "./IndividualPage.module.css";
import GuessName from "./GuessName";
import GuessSound from "./GuessSound";
import GuessSprite from "./GuessSprite";
import { getGlobalRanking } from "../../services/api";

const EXIT_DELAY_MS = 520;

function IndividualPage({ user, onGameStart, onGameEnd, isExiting = false }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [globalRanking, setGlobalRanking] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (selectedGame !== null) return;

    getGlobalRanking(user.id)
      .then(setGlobalRanking)
      .catch(() => {});
  }, [selectedGame, user?.id]);

  useEffect(() => {
    if (selectedGame !== null) return undefined;

    const frameId = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, [selectedGame]);

  const handleSelectGame = (game) => {
    setIsVisible(false);
    window.setTimeout(() => {
      setSelectedGame(game);
    }, EXIT_DELAY_MS);
  };

  if (selectedGame === "hangman") {
    return (
      <div className={styles.gameWrapper}>
        <GuessName
          user={user}
          onGameStart={onGameStart}
          onGameEnd={onGameEnd}
          onChangeMinigame={() => setSelectedGame(null)}
          autoStart
        />
      </div>
    );
  }

  if (selectedGame === "guess-sound") {
    return (
      <div className={styles.gameWrapper}>
        <GuessSound
          user={user}
          onGameStart={onGameStart}
          onGameEnd={onGameEnd}
          onChangeMinigame={() => setSelectedGame(null)}
          autoStart
        />
      </div>
    );
  }

  if (selectedGame === "guess-sprite") {
    return (
      <div className={styles.gameWrapper}>
        <GuessSprite
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
        <div
          className={`${styles.mainPanel} ${isVisible && !isExiting ? styles.mainPanelVisible : ""}`}
        >
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
                onClick={() => handleSelectGame("hangman")}
              >
                Empezar
              </button>
            </article>
            <article className={styles.gameCard}>
              <h3 className={styles.cardTitle}>GuessSound Pokemon</h3>
              <p className={styles.cardScore}>Score M2: {user.scoreM2} pts</p>
              <button
                className={styles.cardBtn}
                onClick={() => handleSelectGame("guess-sound")}
              >
                Empezar
              </button>
            </article>
            <article className={styles.gameCard}>
              <h3 className={styles.cardTitle}>GuessSprite Pokemon</h3>
              <p className={styles.cardScore}>Score M3: {user.scoreM3} pts</p>
              <button
                className={styles.cardBtn}
                onClick={() => handleSelectGame("guess-sprite")}
              >
                Empezar
              </button>
            </article>
          </div>
        </div>

        <div
          className={`${styles.rankingPanel} ${isVisible && !isExiting ? styles.rankingPanelVisible : ""}`}
        >
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

