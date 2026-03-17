import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <header className="app-banner app-banner-top">Banner superior</header>
    <main className="app-content">
      <App />
    </main>
    <footer className="app-banner app-banner-bottom">Banner inferior</footer>
  </StrictMode>,
);
