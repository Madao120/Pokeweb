import React from "react";
import styles from "./FinishPage.module.css";

export default function FinishPage({ finalists }) {
  return (
    <section className={styles.finalCard}>
      <p className={styles.panelLabel}>CLASIFICACION FINAL</p>
      <div className={styles.resultsList}>
        {finalists
          .slice()
          .sort((a, b) => b.totalPoints - a.totalPoints)
          .map((player, index) => (
            <div className={styles.resultRow} key={player.id}>
              <span className={styles.resultPos}>#{index + 1}</span>
              {player.profilePictureUrl ? (
                <img
                  className={styles.resultAvatar}
                  src={player.profilePictureUrl}
                  alt={player.name}
                />
              ) : (
                <div className={styles.resultAvatarFallback}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className={styles.resultName}>{player.name}</span>
              <span className={styles.resultScore}>
                {player.totalPoints} PTS
              </span>
            </div>
          ))}
      </div>
      <button
        className={`${styles.btnStart} ${styles.btnFinishBlue} ${styles.btnReturnMenu}`}
        type="button"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("returnToModeMenu", {
              detail: { skipDelay: true, skipMultiplayerConfirm: true },
            }),
          )
        }
      >
        VOLVER AL MENU
      </button>
    </section>
  );
}
