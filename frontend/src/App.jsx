import "./App.css";

import { useState } from "react";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ModeSelector from "./pages/ModeSelector";

function App() {
  // "login" | "register" | "app"
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);

  if (view === "register") {
    return <Register onRegistered={() => setView("login")} />;
  }

  if (view === "login" && !user) {
    return (
      <Login
        onLogin={(loggedUser) => {
          setUser(loggedUser);
          setView("app");
        }}
        onGoRegister={() => setView("register")}
      />
    );
  }

  return <ModeSelector user={user} />;
}

export default App;
