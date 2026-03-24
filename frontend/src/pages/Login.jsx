import styles from "./Login.module.css";

import { useState } from "react";
import { login } from "../services/api";

function Login({ onLogin, onGoRegister }) {
  const [form, setForm] = useState({ emailOrName: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(form);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <h2 className={styles.title}>LOGIN</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            name="emailOrName"
            placeholder="Email o Nombre de usuario"
            onChange={handleChange}
          />
          <input
            className={styles.input}
            type="password"
            name="password"
            placeholder="Contraseña"
            onChange={handleChange}
          />
          <button className={styles.btnSubmit} type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.links}>
          <p>
            ¿No tienes cuenta?{" "}
            <button className={styles.btnLink} onClick={onGoRegister}>
              Registrarse
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
