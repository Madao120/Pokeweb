import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Banner superior */}
    <header className="app-banner app-banner-top">
      {/* Tornillo + rejilla izquierda */}
      <div className="banner-side banner-side-left">
        <div className="banner-screw" />
        <div className="banner-grid">
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* Centro del banner: ojos decorativos */}
      <div className="banner-center" aria-hidden="true">
        <img
          className="banner-eye banner-eye-left"
          src="/ojoAzul.png"
          alt=""
          loading="eager"
          decoding="async"
        />
        <img
          className="banner-mouth"
          src="/bocaOk.png"
          alt=""
          loading="eager"
          decoding="async"
          width={200}
        />
        <img
          className="banner-eye banner-eye-right"
          src="/ojoAzul.png"
          alt=""
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Rejilla + tornillo derecha */}
      <div className="banner-side banner-side-right">
        <div className="banner-grid">
          <span />
          <span />
          <span />
        </div>
        <div className="banner-screw" />
      </div>
    </header>

    <BrowserRouter>
      <main className="app-content">
        <App />
      </main>
    </BrowserRouter>

    {/* Banner inferior — imágenes en paso 5 */}
    <footer className="app-banner app-banner-bottom" />
  </StrictMode>,
);
