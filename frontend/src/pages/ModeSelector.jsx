import styles from "./ModeSelector.module.css";
import { useEffect, useState } from "react";
import HangmanGame from "./HangmanGame";

function ModeSelector({
  user,
  onReturnToMenu,
  onNavigationChange,
  onGameStart,
  onGameEnd,
}) {
  const [mode, setMode] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const handleSelectMode = (nextMode) => {
    setSelectedGame(null);
    setMode(nextMode);
    onNavigationChange?.(true);
  };

  useEffect(() => {
    const goBackToModes = async () => {
      onNavigationChange?.(false);
      await onReturnToMenu();
      setSelectedGame(null);
      setMode(null);
      onGameEnd();
    };
    window.addEventListener("returnToModeMenu", goBackToModes);
    return () => {
      window.removeEventListener("returnToModeMenu", goBackToModes);
      onNavigationChange?.(false);
    };
  }, [onReturnToMenu, onGameEnd, onNavigationChange]);

  if (mode === "single" && selectedGame === "hangman") {
    return (
      <div className={styles.gameWrapper}>
        <HangmanGame
          user={user}
          onGameStart={onGameStart}
          onGameEnd={onGameEnd}
          autoStart
        />
      </div>
    );
  }

  if (mode === "multi") {
    return (
      <div className={styles.gameWrapper}>
        <div className={styles.multiContent}>
          <p className={styles.multiModeText}>
            Modo multijugador - proximamente.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "single") {
    return (
      <div className={styles.page}>
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
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.mainPanel}>
        <div className={styles.header}>
          <p className={styles.welcome}>BIENVENIDO/A</p>
          <p className={styles.username}>{user.name}</p>
          <p className={styles.score}>{user.globalScore} PTS</p>
        </div>

        <h3 className={styles.subtitle}>Elige modo de juego</h3>

        <div className={styles.modeGrid}>
          <button
            className={styles.modeCard}
            onClick={() => handleSelectMode("single")}
          >
            Individual
          </button>
          <button
            className={`${styles.modeCard} ${styles.disabled}`}
            onClick={() => handleSelectMode("multi")}
          >
            Multijugador
            <span className={styles.comingSoon}>PROXIMAMENTE</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModeSelector;
