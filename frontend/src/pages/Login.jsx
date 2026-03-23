//import "./Login.css";

import { useState } from "react";
import { login } from "../services/api";

function Login({ onLogin, onGoRegister }) {
  const [form, setForm] = useState({ emaiemailOrNamel: "", password: "" });
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
    <div className="login-container">
      <h2>Login</h2>

      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="emailOrName"
          placeholder="Email o Nombre de usuario"
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          onChange={handleChange}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {error && <p className="login-error">{error}</p>}

      <div className="login-links">
        <p>
          ¿No tienes cuenta? <button onClick={onGoRegister}>Registrarse</button>
        </p>
      </div>
    </div>
  );
}

export default Login;
