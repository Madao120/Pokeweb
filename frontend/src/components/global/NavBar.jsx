import { useLocation, useNavigate } from "react-router-dom";
import styles from "./NavBar.module.css";

function NavBar({ user, inGame, canReturnToModes }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isProfilePage = location.pathname === "/profile";

  const handleGoMenu = () => {
    if (isProfilePage) {
      navigate("/");
      return;
    }

    if (inGame) {
      const confirmar = window.confirm(
        "Tienes una partida en curso. Si sales ahora perderÃ¡s 25 puntos por abandono. Â¿Quieres continuar?",
      );
      if (!confirmar) return;
      window.dispatchEvent(
        new CustomEvent("returnToModeMenu", { cancelable: true }),
      );
      return;
    }

    if (canReturnToModes) {
      window.dispatchEvent(
        new CustomEvent("returnToModeMenu", { cancelable: true }),
      );
      return;
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
          <div
            className={styles.leftCapsules}
            onClick={() => navigate("/profile")}
          >
            <span className={styles.photoBox}>
              {user.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={user.name}
                  className={styles.photo}
                />
              ) : (
                <span className={styles.photoFallback}>
                  {user.name?.charAt(0)}
                </span>
              )}
            </span>
            <span className={styles.capsule}>
              {user.name}: {user.globalScore} pts
            </span>
          </div>

          <div className={styles.rightControls}>
            <button
              className={`${styles.ctrlBtn} ${styles.btnDanger}`}
              onClick={handleForceLose}
              title="Forzar fin de ronda (mostrar PokÃ©mon)"
              disabled={!inGame}
            >
              {"\u2715"}
            </button>
            <button
              className={`${styles.ctrlBtn} ${styles.btnReturn}`}
              onClick={handleGoMenu}
              title="Volver al menÃº"
              disabled={!isProfilePage && !inGame && !canReturnToModes}
            >
              <span className={styles.returnIcon} aria-hidden="true">
                {"\u2190"}
              </span>
            </button>
          </div>
        </>
      )}
    </nav>
  );
}

export default NavBar;

