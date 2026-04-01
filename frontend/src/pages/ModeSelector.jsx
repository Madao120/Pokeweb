import styles from "./ModeSelector.module.css";

import { useState } from "react";
import GuessPokemon from "./GuessPokemon";

function ModeSelector({ user, onReturnToMenu, onGameStart, onGameEnd }) {
  const [mode, setMode] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  if (mode === "single" && selectedGame === "hangman") {
    return (
      <div className={styles.gameWrapper}>
        <GuessPokemon
          user={user}
          onGameStart={onGameStart}
          onGameEnd={onGameEnd}
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
                onReturnToMenu();
              }}
            >
              Empezar
            </button>
          </article>
        </div>
      </div>
    );
  }

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
