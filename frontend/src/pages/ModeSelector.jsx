import styles from "./ModeSelector.module.css";
import { useEffect, useState } from "react";
import IndividualPage from "../components/single/IndividualPage";
import MultiplayerPage from "../components/multi/MultiplayerPage";

const EXIT_DELAY_MS = 520;

function ModeSelector({
  user,
  onReturnToMenu,
  onNavigationChange,
  onGameStart,
  onGameEnd,
}) {
  const [mode, setMode] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleSelectMode = (nextMode) => {
    setIsExiting(true);
    window.setTimeout(() => {
      setMode(nextMode);
      setIsExiting(false);
      onNavigationChange?.(true);
    }, EXIT_DELAY_MS);
  };

  useEffect(() => {
    const goBackToModes = async () => {
      onNavigationChange?.(false);
      await onReturnToMenu();
      setMode(null);
      onGameEnd();
    };
    window.addEventListener("returnToModeMenu", goBackToModes);
    return () => {
      window.removeEventListener("returnToModeMenu", goBackToModes);
      onNavigationChange?.(false);
    };
  }, [onReturnToMenu, onGameEnd, onNavigationChange]);

  if (mode === "multi") {
    return <MultiplayerPage />;
  }

  if (mode === "single") {
    return (
      <IndividualPage
        user={user}
        onGameStart={onGameStart}
        onGameEnd={onGameEnd}
      />
    );
  }

  return (
    <div className={`${styles.page} ${isExiting ? styles.pageExit : ""}`}>
      <div
        className={`${styles.mainPanel} ${isExiting ? styles.mainPanelExit : ""}`}
      >
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
