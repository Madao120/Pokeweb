import { useNavigate } from "react-router-dom";
//import "./NavBar.css";

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
    <nav className="navbar">
      {/* Logo — vuelve al menú principal */}
      <span
        className="navbar-logo"
        onClick={() => handleNavigate("/")}
        style={{ cursor: "pointer" }}
      >
        PokeWeb
      </span>

      {/* Perfil de usuario a la derecha */}
      {user && (
        <div className="navbar-user">
          <div
            className="navbar-user-info"
            onClick={() => handleNavigate("/profile")}
            style={{ cursor: "pointer" }}
          >
            {user.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user.name}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#ffbb4a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="navbar-username">{user.name}</p>
              <p className="navbar-points">{user.score} pts</p>
            </div>
          </div>
          <button className="navbar-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default NavBar;
