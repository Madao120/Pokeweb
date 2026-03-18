import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <header className="app-banner app-banner-top">Banner superior</header>
    <BrowserRouter>
      <main className="app-content">
        <App />
      </main>
    </BrowserRouter>
    <footer className="app-banner app-banner-bottom">Banner inferior</footer>
  </StrictMode>,
);
