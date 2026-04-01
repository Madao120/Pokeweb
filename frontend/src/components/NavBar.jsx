import { useNavigate } from "react-router-dom";
import styles from "./NavBar.module.css";

function NavBar({ user, inGame, onLogout }) {
  const navigate = useNavigate();

  const handleGoMenu = () => {
    if (inGame) {
      const confirmar = window.confirm(
        "Tienes una partida en curso. Si sales ahora perderás 25 puntos por abandono. ¿Quieres continuar?",
      );
      if (!confirmar) return;
    }
    navigate("/");
  };

  const handleForceLose = () => {
    if (!inGame) return;
    window.dispatchEvent(new CustomEvent("forceLoseGuessPokemon"));
  };

  return (
    <nav className={styles.navbar}>
      {user && (
        <>
          <div className={styles.leftCapsules} onClick={() => navigate("/profile")}>
            <span className={styles.capsule}>Foto</span>
            <span className={styles.capsule}>Score {user.globalScore}</span>
            <span className={styles.capsule}>{user.name}</span>
          </div>

          <div className={styles.rightControls}>
            <button
              className={`${styles.ctrlBtn} ${styles.btnDanger}`}
              onClick={handleForceLose}
              title="Forzar fin de ronda (mostrar Pokémon)"
            >
              ✕
            </button>
            <button
              className={`${styles.ctrlBtn} ${styles.btnReturn}`}
              onClick={handleGoMenu}
              title="Volver al menú"
            >
              ⮌
            </button>
            <button className={styles.hiddenLogout} onClick={onLogout} title="Cerrar sesión">
              Logout
            </button>
            </div>
          </>
      )}
    </nav>
  );
}

export default NavBar;
