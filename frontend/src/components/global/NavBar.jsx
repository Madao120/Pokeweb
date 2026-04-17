import { useLocation, useNavigate } from "react-router-dom";
import styles from "./NavBar.module.css";

function NavBar({
  user,
  inGame,
  canReturnToModes,
  leaveRisk,
  requestConfirm,
  onReturnToModes,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isProfilePage = location.pathname === "/profile";

  const confirmLeaveIfNeeded = async () => {
    if (leaveRisk?.active) {
      return requestConfirm?.({
        title: leaveRisk.title || "Confirmar salida",
        message:
          leaveRisk.message ||
          "Si sales ahora, perderas el progreso actual.",
        confirmLabel: leaveRisk.confirmLabel || "Salir",
        cancelLabel: leaveRisk.cancelLabel || "Seguir aqui",
      });
    }

    if (inGame) {
      return requestConfirm?.({
        title: "Abandonar partida",
        message:
          "Tienes una partida en curso. Si sales ahora perderas 25 puntos por abandono.",
        confirmLabel: "Abandonar",
        cancelLabel: "Seguir jugando",
      });
    }

    return true;
  };

  const handleOpenProfile = async () => {
    if (isProfilePage) return;
    const confirmed = await confirmLeaveIfNeeded();
    if (!confirmed) return;
    navigate("/profile");
  };

  const handleGoMenu = async () => {
    if (onReturnToModes) {
      await onReturnToModes();
      return;
    }

    if (isProfilePage) {
      navigate("/");
      return;
    }

    const confirmed = await confirmLeaveIfNeeded();
    if (!confirmed) return;

    if (inGame || leaveRisk?.active) {
      window.dispatchEvent(
        new CustomEvent("returnToModeMenu", {
          cancelable: true,
          detail: {
            skipMultiplayerConfirm: true,
            skipDailyConfirm: true,
            skipSingleConfirm: true,
          },
        }),
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
            onClick={() => {
              handleOpenProfile().catch(() => {});
            }}
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
              onClick={() => {
                handleGoMenu().catch(() => {});
              }}
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

