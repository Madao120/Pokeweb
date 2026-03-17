import "./App.css";

import { useState } from "react";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ModeSelector from "./pages/ModeSelector";

function App() {
  // "login" | "register" | "app"
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);

  // Refresca los datos del usuario desde el backend (score actualizado)
  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const updated = await getUser(user.id);
      setUser(updated);
    } catch (err) {
      console.error("Error al refrescar usuario:", err);
    }
  };

  let content;

  if (view === "register") {
    content = <Register onRegistered={() => setView("login")} />;
  }

  if (view === "login" && !user && !content) {
    content = (
      <Login
        onLogin={(loggedUser) => {
          setUser(loggedUser);
          setView("app");
        }}
        onGoRegister={() => setView("register")}
      />
    );
  }

  if (!content) {
    content = <ModeSelector user={user} onReturnToMenu={refreshUser} />;
  }

  return <section className="app-shell">{content}</section>;
}

export default App;
