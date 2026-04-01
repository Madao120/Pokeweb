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
  const [user, setUser] = useState(null);
  const [inGame, setInGame] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
    navigate("/");
  };

  const handleLogout = () => {
    setUser(null);
    setInGame(false);
    navigate("/login");
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const updated = await getUser(user.id);
      setUser(updated);
    } catch (err) {
      console.error("Error al refrescar usuario:", err);
    }
  };

  return (
    <section className="app-shell">
      <header className="top-global-banner">
        <span className="top-global-slash">///</span>
        <span className="top-global-title">PokeWeb</span>
        <span className="top-global-slash">///</span>
      </header>

      <div className="app-routes">
        <Routes>
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

      {/* Banner inferior */}
      {user && <NavBar user={user} inGame={inGame} onLogout={handleLogout} />}
    </section>
  );
}

export default App;
