import styles from "./ModeSelector.module.css";
import { useEffect, useState } from "react";
import IndividualPage from "../components/single/IndividualPage";
import MultiplayerPage from "../components/multi/MultiplayerPage";
import DailyModePage from "../components/daily/DailyModePage";

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
  const [isVisible, setIsVisible] = useState(false);
  const [isReturningToModes, setIsReturningToModes] = useState(false);

  useEffect(() => {
    if (mode !== null) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [mode]);

  const handleSelectMode = (nextMode) => {
    setIsExiting(true);
    setIsVisible(false);
    window.setTimeout(() => {
      setMode(nextMode);
      setIsExiting(false);
      onNavigationChange?.(true);
    }, EXIT_DELAY_MS);
  };

  useEffect(() => {
    const goBackToModes = async (event) => {
      setIsVisible(false);
      setIsReturningToModes(true);

      if (!event?.detail?.skipDelay) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, EXIT_DELAY_MS),
        );
      }
      onNavigationChange?.(false);
      await onReturnToMenu();
      setMode(null);
      setIsReturningToModes(false);
      onGameEnd();
    };

    window.addEventListener("returnToModeMenu", goBackToModes);
    return () => {
      window.removeEventListener("returnToModeMenu", goBackToModes);
      onNavigationChange?.(false);
    };
  }, [onReturnToMenu, onGameEnd, onNavigationChange]);

  if (mode === "multi") {
    return <MultiplayerPage user={user} />;
  }

  if (mode === "daily") {
    return (
      <DailyModePage
        user={user}
        onBack={() => window.dispatchEvent(new CustomEvent("returnToModeMenu"))}
      />
    );
  }

  if (mode === "single") {
    return (
      <IndividualPage
        user={user}
        onGameStart={onGameStart}
        onGameEnd={onGameEnd}
        isExiting={isReturningToModes}
      />
    );
  }

  return (
    <div
      className={`${styles.page} ${isVisible && !isExiting ? styles.pageVisible : ""}`}
    >
      <div
        className={`${styles.mainPanel} ${isVisible && !isExiting ? styles.mainPanelVisible : ""}`}
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
            onClick={() => handleSelectMode("daily")}
          >
            Diario
          </button>
          <button
            className={styles.modeCard}
            onClick={() => handleSelectMode("single")}
          >
            Individual
          </button>
          <button
            className={styles.modeCard}
            onClick={() => handleSelectMode("multi")}
          >
            Multijugador
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModeSelector;
