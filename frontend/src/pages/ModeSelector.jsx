import styles from "./ModeSelector.module.css";

import { useState } from "react";
import GuessPokemon from "./GuessPokemon";

function ModeSelector({ user, onReturnToMenu, onGameStart, onGameEnd }) {
  const [mode, setMode] = useState(null);

  const handleVolver = async () => {
    // Refresca el score antes de volver al menú
    await onReturnToMenu();
    setMode(null);
  };

  const renderBottomBack = () => (
    <div className={styles.bottomBack}>
      <button className={styles.btnBack} onClick={handleVolver}>
        VOLVER
      </button>
    </div>
  );

  if (mode === "single") {
    return (
      <div className={styles.gameWrapper}>
        <GuessPokemon
          user={user}
          onGameStart={onGameStart}
          onGameEnd={onGameEnd}
        />
        {renderBottomBack()}
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
        {renderBottomBack()}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.welcome}>BIENVENIDO/A</p>
        <p className={styles.username}>{user.name}</p>
        <p className={styles.score}>{user.score} PTS</p>
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
