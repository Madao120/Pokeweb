import "./App.css";

import { useCallback, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import ModeSelector from "./pages/ModeSelector";
import Profile from "./pages/Profile";
import NavBar from "./components/NavBar";
import { getUser } from "./services/api";

const USER_STORAGE_KEY = "pokeweb_user";

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!savedUser) return null;

    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser?.id) return parsedUser;
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  });
  const [inGame, setInGame] = useState(false);
  const [canReturnToModes, setCanReturnToModes] = useState(false);
  const navigate = useNavigate();

  const syncStoredUser = useCallback((nextUser) => {
    if (nextUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      return;
    }
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const handleLogin = useCallback((loggedUser) => {
    setUser(loggedUser);
    syncStoredUser(loggedUser);
    navigate("/");
  }, [navigate, syncStoredUser]);

  const handleLogout = useCallback(() => {
    setUser(null);
    syncStoredUser(null);
    setInGame(false);
    setCanReturnToModes(false);
    navigate("/login");
  }, [navigate, syncStoredUser]);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const updated = await getUser(user.id);
      setUser(updated);
      syncStoredUser(updated);
    } catch (err) {
      console.error("Error al refrescar usuario:", err);
    }
  }, [user?.id, syncStoredUser]);

  const handleGameStart = useCallback(() => {
    setInGame(true);
  }, []);

  const handleGameEnd = useCallback(async () => {
    setInGame(false);
    await refreshUser();
  }, [refreshUser]);

  return (
    <section className="app-shell">
      <header className="top-global-banner">
        <span className="top-global-slash"> / / / </span>
        <span className="top-global-title">PokeWeb</span>
        <span className="top-global-slash"> / / / </span>
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
                <Register
                  onRegistered={handleLogin}
                  onGoLogin={() => navigate("/login")}
                />
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
                  onNavigationChange={setCanReturnToModes}
                  onGameStart={handleGameStart}
                  onGameEnd={handleGameEnd}
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
                  onProfileUpdated={(updated) => {
                    setUser(updated);
                    syncStoredUser(updated);
                  }}
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
      {user && (
        <NavBar
          user={user}
          inGame={inGame}
          canReturnToModes={canReturnToModes}
          onLogout={handleLogout}
        />
      )}
    </section>
  );
}

export default App;
