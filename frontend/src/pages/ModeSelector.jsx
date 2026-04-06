import styles from "./ModeSelector.module.css";
import { useEffect, useState } from "react";
import HangmanGame from "./HangmanGame";

function ModeSelector({ user, onReturnToMenu, onGameStart, onGameEnd }) {
  const [mode, setMode] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const goBackToModes = async () => {
      await onReturnToMenu();
      setSelectedGame(null);
      setMode(null);
      onGameEnd();
    };
    window.addEventListener("returnToModeMenu", goBackToModes);
    return () => window.removeEventListener("returnToModeMenu", goBackToModes);
  }, [onReturnToMenu, onGameEnd]);

  // Individual → Ahorcado
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

  // Multijugador (pendiente)
  if (mode === "multi") {
    return (
      <div className={styles.gameWrapper}>
        <div className={styles.multiContent}>
          <p className={styles.multiModeText}>Modo multijugador — próximamente.</p>
        </div>
      </div>
    );
  }

  // Selección de minijuego individual
  if (mode === "single") {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <p className={styles.welcome}>MINIJUEGOS INDIVIDUALES</p>
          <p className={styles.username}>{user.name}</p>
          <p className={styles.score}>{user.globalScore} PTS</p>
        </div>

        <div className={styles.cardsGrid}>
          <article className={styles.gameCard}>
            <h3 className={styles.cardTitle}>Ahorcado Pokémon</h3>
            <p className={styles.cardScore}>Score M1: {user.scoreM1} pts</p>
            <button
              className={styles.cardBtn}
              onClick={() => {
                setSelectedGame("hangman");
                onGameStart();
              }}
            >
              Empezar
            </button>
          </article>
        </div>
      </div>
    );
  }

  // Pantalla principal: elegir modo
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.welcome}>BIENVENIDO/A</p>
        <p className={styles.username}>{user.name}</p>
        <p className={styles.score}>{user.globalScore} PTS</p>
      </div>

      <h3 className={styles.subtitle}>Elige modo de juego</h3>

      <div className={styles.modeGrid}>
        <button className={styles.modeCard} onClick={() => setMode("single")}>
          Individual
        </button>
        <button
          className={`${styles.modeCard} ${styles.disabled}`}
          onClick={() => setMode("multi")}
        >
          Multijugador
          <span className={styles.comingSoon}>PRÓXIMAMENTE</span>
        </button>
      </div>
    </div>
  );
}

export default ModeSelector;
