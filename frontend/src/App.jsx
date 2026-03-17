import "./App.css";

import { useState } from "react";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ModeSelector from "./pages/ModeSelector";

function App() {
  // "login" | "register" | "app"
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);

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
    content = <ModeSelector user={user} />;
  }

  return <section className="app-shell">{content}</section>;
}

export default App;
