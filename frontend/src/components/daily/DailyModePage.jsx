import { useState } from "react";

import GuessName from "../single/GuessName";
import GuessSprite from "../single/GuessSprite";
import styles from "./DailyModePage.module.css";

function DailyModePage({ user, onBack }) {
  const [round, setRound] = useState(1);

  return (
    <div className={styles.page}>
      <div className={styles.topSwitch}>
        <button
          type="button"
          className={`${styles.switchBtn} ${round === 1 ? styles.switchBtnActive : ""}`}
          onClick={() => setRound(1)}
        >
          Ahorcado Diario
        </button>
        <button
          type="button"
          className={`${styles.switchBtn} ${round === 2 ? styles.switchBtnActive : ""}`}
          onClick={() => setRound(2)}
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
          />
        )}
      </div>
    </div>
  );
}

export default DailyModePage;
