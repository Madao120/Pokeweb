import "./App.css";

import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import ModeSelector from "./pages/ModeSelector";
import Profile from "./pages/Profile";
import NavBar from "./components/NavBar";
import { getUser } from "./services/api";

function App() {
  // El usuario activo (null si no hay sesión iniciada)
  const [user, setUser] = useState(null);
  // Indica si hay una partida activa (para el aviso de penalización en NavBar)
  const [inGame, setInGame] = useState(false);

  // Hook de navegación
  const navigate = useNavigate();

  // Manejador del login
  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
    navigate("/");
  };

  //Manejador del Logout
  const handleLogout = () => {
    setUser(null);
    setInGame(false);
    navigate("/login");
  };

  // Función para refrescar los datos del usuario
  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const updated = await getUser(user.id);
      setUser(updated);
    } catch (err) {
      console.error("Error al refrescar usuario:", err);
    }
  };

  /// Explicación del return ///
  
  /// Primero
  // se muestra el NavBar solo si hay un usuario logueado, pasándole el usuario, el estado de partida y el manejador de logout.
  
  ///Segundo
  // En caso de que el usuario intente acceder a /login o /register estando ya logueado, se le redirige al menú principal (/).

  ///Tercero
  // Las rutas privadas (/, /profile) solo son accesibles si hay un usuario logueado. Si no, redirigen a /login.

  ///Cuarto
  // Cualquier ruta desconocida redirige al inicio (/).
  return (
    <section className="app-shell">
      {user && <NavBar user={user} inGame={inGame} onLogout={handleLogout} />}

      <Routes>
        {/* Rutas públicas */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/" />
            ) : (
              <Login
                onLogin={handleLogin}
                onGoRegister={() => navigate("/register")}
              />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/" />
            ) : (
              <Register onRegistered={() => navigate("/login")} />
            )
          }
        />

        {/* Rutas privadas */}
        <Route
          path="/"
          element={
            user ? (
              <ModeSelector
                user={user}
                onReturnToMenu={refreshUser}
                onGameStart={() => setInGame(true)}
                onGameEnd={() => setInGame(false)}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? (
              <Profile
                user={user}
                onProfileUpdated={(updated) => setUser(updated)}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Cualquier ruta desconocida redirige al inicio */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </section>
  );
}

export default App;
