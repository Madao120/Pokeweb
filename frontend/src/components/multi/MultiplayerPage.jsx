import styles from "./MultiplayerPage.module.css";

function MultiplayerPage() {
  return (
    <div className={styles.page}>
      <div className={styles.mainPanel}>
        <div className={styles.header}>
          <p className={styles.welcome}>MODO MULTIJUGADOR</p>
          <p className={styles.subtitle}>Elige como quieres entrar</p>
        </div>

        <div className={styles.optionGrid}>
          <article className={styles.optionCard}>
            <h3 className={styles.optionTitle}>Crear sala</h3>
            <p className={styles.optionText}>
              Prepara una nueva sala y configura la partida.
            </p>
            <button className={styles.optionBtn} type="button">
              Crear
            </button>
          </article>

          <article className={styles.optionCard}>
            <h3 className={styles.optionTitle}>Unirse a sala</h3>
            <p className={styles.optionText}>
              Entra a una sala existente con codigo o invitacion.
            </p>
            <button className={styles.optionBtn} type="button">
              Unirse
            </button>
          </article>
        </div>
      </div>
    </div>
  );
}

export default MultiplayerPage;
