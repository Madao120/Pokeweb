import styles from "./Login.module.css";

import { useEffect, useState } from "react";
import { login } from "../services/api";

const EXIT_DELAY_MS = 520;

function Login({ onLogin, onGoRegister }) {
  const [form, setForm] = useState({ emailOrName: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(form);
      setIsExiting(true);
      window.setTimeout(() => {
        onLogin(user);
      }, EXIT_DELAY_MS);
    } catch (err) {
      setError(err.message);
      setIsExiting(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${styles.page} ${isVisible && !isExiting ? styles.pageVisible : ""}`}
    >
      <div
        className={`${styles.panel} ${isVisible && !isExiting ? styles.panelVisible : ""}`}
      >
        <h2 className={styles.title}>LOGIN</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputFrame}>
            <input
              className={styles.input}
              type="text"
              name="emailOrName"
              placeholder="Email o Nombre de usuario"
              onChange={handleChange}
            />
          </div>

          <div className={styles.inputFrame}>
            <input
              className={styles.input}
              type="password"
              name="password"
              placeholder="Contrasena"
              onChange={handleChange}
            />
          </div>

          <button className={styles.btnSubmit} type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.links}>
          <p>
            No tienes cuenta?{" "}
            <button
              className={styles.btnLink}
              onClick={() => {
                setIsExiting(true);
                window.setTimeout(() => {
                  onGoRegister();
                }, EXIT_DELAY_MS);
              }}
            >
              Registrarse
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
