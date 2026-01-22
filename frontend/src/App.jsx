import "./App.css";

import { useState } from "react";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ModeSelector from "./pages/ModeSelector";

function App() {
  const [user, setUser] = useState(null);

  // Si no hay usuario logueado → mostramos login / register
  if (!user) {
    return (
      <div>
        <Register />
        <hr />
        <Login onLogin={setUser} />
      </div>
    );
  }

  // Si hay usuario → vamos a selección de modo
  return <ModeSelector user={user} />;
}

export default App;
