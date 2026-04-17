import { useCallback, useState } from "react";

import GuessName from "../single/GuessName";
import GuessSprite from "../single/GuessSprite";
import styles from "./DailyModePage.module.css";

function DailyModePage({ user, onBack, onLeaveRiskChange, requestConfirm }) {
  const [round, setRound] = useState(1);
  const [leaveRisk, setLeaveRisk] = useState({ active: false });

  const handleLeaveRiskChange = useCallback(
    (nextRisk) => {
      const resolvedRisk = nextRisk || { active: false };
      setLeaveRisk(resolvedRisk);
      onLeaveRiskChange?.(resolvedRisk);
    },
    [onLeaveRiskChange],
  );

  const handleSelectRound = useCallback(
    async (nextRound) => {
      if (nextRound === round) return;

      if (leaveRisk?.active) {
        const confirmed = await requestConfirm?.({
          title: leaveRisk.title || "Salir del reto diario",
          message:
            leaveRisk.message ||
            "Si cambias de ronda ahora, perderas el progreso actual del reto diario.",
          confirmLabel: "Cambiar",
          cancelLabel: "Seguir jugando",
        });
        if (!confirmed) return;
      }

      setRound(nextRound);
    },
    [leaveRisk, requestConfirm, round],
  );

  return (
    <div className={styles.page}>
      <div className={styles.topSwitch}>
        <button
          type="button"
          className={`${styles.switchBtn} ${round === 1 ? styles.switchBtnActive : ""}`}
          onClick={() => {
            handleSelectRound(1).catch(() => {});
          }}
        >
          Ahorcado Diario
        </button>
        <button
          type="button"
          className={`${styles.switchBtn} ${round === 2 ? styles.switchBtnActive : ""}`}
          onClick={() => {
            handleSelectRound(2).catch(() => {});
          }}
        >
          GuessSprite Diario
        </button>
      </div>

      <div className={styles.content}>
        {round === 1 ? (
          <GuessName
            user={user}
            mode="daily"
            autoStart
            onGameStart={() => {}}
            onGameEnd={() => {}}
            onChangeMinigame={() => setRound(2)}
            onLeaveRiskChange={handleLeaveRiskChange}
          />
        ) : (
          <GuessSprite
            user={user}
            mode="daily"
            autoStart
            onGameStart={() => {}}
            onGameEnd={() => {}}
            onChangeMinigame={() => setRound(1)}
            onBack={onBack}
            onLeaveRiskChange={handleLeaveRiskChange}
          />
        )}
      </div>
    </div>
  );
}

export default DailyModePage;
