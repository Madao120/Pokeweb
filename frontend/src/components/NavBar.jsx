import { useNavigate } from "react-router-dom";
import styles from "./NavBar.module.css";

function NavBar({ user, inGame, onLogout }) {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    // Realizaré un handleNavigate para que cuando se está en partida salte un aviso de que en caso de abandonarla se tendrá una penalización
    if (inGame) {
      const confirmar = window.confirm(
        "Tienes una partida en curso. Si sales ahora perderás 25 puntos por abandono. ¿Quieres continuar?",
      );
      if (!confirmar) return;
    }
    navigate(path);
  };

  return (
    <nav className={styles.navbar}>
      {/* Logo — vuelve al menú principal */}
      <span className={styles.logo} onClick={() => handleNavigate("/")}>
        PokeWeb
      </span>

      {/* Perfil de usuario a la derecha */}
      {user && (
        <div className={styles.userZone}>
          <div
            className={styles.userInfo}
            onClick={() => handleNavigate("/profile")}
          >
            {user.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user.name}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarInicial}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.userPersonal}>
              <p className={styles.username}>{user.name}</p>
              <p className={styles.points}>{user.globalScore} pts</p>
            </div>
          </div>
          <button className={styles.btnLogout} onClick={onLogout}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default NavBar;
