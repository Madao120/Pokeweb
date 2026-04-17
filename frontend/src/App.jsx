import "./App.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import ModeSelector from "./pages/ModeSelector";
import Profile from "./pages/Profile";
import NavBar from "./components/global/NavBar";
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
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacyClosing, setPrivacyClosing] = useState(false);
  const [leaveRisk, setLeaveRisk] = useState({ active: false });
  const [confirmDialog, setConfirmDialog] = useState(null);
  const privacyCloseTimerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const closePrivacy = useCallback(() => {
    setPrivacyClosing(true);
    if (privacyCloseTimerRef.current) {
      window.clearTimeout(privacyCloseTimerRef.current);
    }
    privacyCloseTimerRef.current = window.setTimeout(() => {
      setShowPrivacy(false);
      setPrivacyClosing(false);
      privacyCloseTimerRef.current = null;
    }, 220);
  }, []);

  const openPrivacy = useCallback(() => {
    if (privacyCloseTimerRef.current) {
      window.clearTimeout(privacyCloseTimerRef.current);
      privacyCloseTimerRef.current = null;
    }
    setPrivacyClosing(false);
    setShowPrivacy(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && showPrivacy) closePrivacy();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closePrivacy, showPrivacy]);

  useEffect(() => {
    return () => {
      if (privacyCloseTimerRef.current) {
        window.clearTimeout(privacyCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    window.__SINGLE_SHOULD_CONFIRM_EXIT = inGame;
    return () => {
      window.__SINGLE_SHOULD_CONFIRM_EXIT = false;
    };
  }, [inGame]);

  const syncStoredUser = useCallback((nextUser) => {
    if (nextUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      return;
    }
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const handleLogin = useCallback(
    (loggedUser) => {
      setUser(loggedUser);
      syncStoredUser(loggedUser);
      navigate("/");
    },
    [navigate, syncStoredUser],
  );

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

  const requestConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title: options?.title || "Confirmar salida",
        message: options?.message || "Se perdera el progreso actual. Quieres continuar?",
        confirmLabel: options?.confirmLabel || "Aceptar",
        cancelLabel: options?.cancelLabel || "Cancelar",
        onClose: resolve,
      });
    });
  }, []);

  const handleReturnToModes = useCallback(async () => {
    const isProfilePage = location.pathname === "/profile";

    if (isProfilePage) {
      navigate("/");
      return;
    }

    if (leaveRisk?.active) {
      const confirmed = await requestConfirm({
        title: leaveRisk.title || "Confirmar salida",
        message:
          leaveRisk.message || "Si sales ahora, perderas el progreso actual.",
        confirmLabel: leaveRisk.confirmLabel || "Salir",
        cancelLabel: leaveRisk.cancelLabel || "Seguir aqui",
      });
      if (!confirmed) return;
    } else if (inGame) {
      const confirmed = await requestConfirm({
        title: "Abandonar partida",
        message:
          "Tienes una partida en curso. Si sales ahora perderas 25 puntos por abandono.",
        confirmLabel: "Abandonar",
        cancelLabel: "Seguir jugando",
      });
      if (!confirmed) return;
    }

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
  }, [canReturnToModes, inGame, leaveRisk, location.pathname, navigate, requestConfirm]);

  return (
    <section className="app-shell">
      <header className="top-global-banner">
        <div className="top-global-side top-global-side-left">
          <span className="top-global-mark" aria-hidden="true">
            <span>_</span>
            <span>_</span>
            <span>_</span>
          </span>
        </div>
        <div className="top-global-center">
          <img src="/logo.png" alt="" className="top-global-logo" aria-hidden="true" />
          <button
            type="button"
            className="top-global-title-btn"
            onClick={() => {
              handleReturnToModes().catch(() => {});
            }}
          >
            <span className="top-global-title">PokeWeb</span>
          </button>
          <button
            type="button"
            className="top-global-list-btn"
            title="Politicas de privacidad"
            onClick={openPrivacy}
          >
            <svg
              className="top-global-list-icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
              />
            </svg>
          </button>
        </div>
        <div className="top-global-side top-global-side-right">
          <span className="top-global-mark" aria-hidden="true">
            <span>_</span>
            <span>_</span>
            <span>_</span>
          </span>
        </div>
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
                  onLeaveRiskChange={setLeaveRisk}
                  requestConfirm={requestConfirm}
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
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

      {showPrivacy && (
        <div
          className={`privacy-overlay ${privacyClosing ? "is-exit" : ""}`}
          onClick={closePrivacy}
        >
          <section className="privacy-modal" onClick={(event) => event.stopPropagation()}>
            <div className="privacy-header">
              <p className="privacy-title">Politicas de Privacidad</p>
              <button
                type="button"
                className="privacy-close"
                onClick={closePrivacy}
              >
                {"\u2715"}
              </button>
            </div>
            <div className="privacy-body">
              <p>Solo guardamos los datos necesarios para tu cuenta y progreso en el juego.</p>
              <p>No compartimos tus datos personales con terceros para fines comerciales.</p>
              <p>Puedes solicitar la actualizacion o eliminacion de tu cuenta en cualquier momento.</p>
            </div>
          </section>
        </div>
      )}

      {confirmDialog && (
        <div
          className="global-confirm-overlay"
          onClick={() => {
            const onClose = confirmDialog.onClose;
            setConfirmDialog(null);
            onClose(false);
          }}
        >
          <section
            className="global-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="global-confirm-header">
              <p className="global-confirm-title">{confirmDialog.title}</p>
            </div>
            <div className="global-confirm-body">
              <p>{confirmDialog.message}</p>
            </div>
            <div className="global-confirm-actions">
              <button
                type="button"
                className="global-confirm-btn global-confirm-btn-ghost"
                onClick={() => {
                  const onClose = confirmDialog.onClose;
                  setConfirmDialog(null);
                  onClose(false);
                }}
              >
                {confirmDialog.cancelLabel}
              </button>
              <button
                type="button"
                className="global-confirm-btn global-confirm-btn-primary"
                onClick={() => {
                  const onClose = confirmDialog.onClose;
                  setConfirmDialog(null);
                  onClose(true);
                }}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Banner inferior */}
      {user && (
        <NavBar
          user={user}
          inGame={inGame}
          canReturnToModes={canReturnToModes}
          leaveRisk={leaveRisk}
          requestConfirm={requestConfirm}
          onReturnToModes={handleReturnToModes}
        />
      )}
    </section>
  );
}

export default App;
