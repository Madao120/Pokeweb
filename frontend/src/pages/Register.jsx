import styles from "./Register.module.css";
import { useState } from "react"; //UseState, sirve para manejar estados en componentes funcionales
import { createUser } from "../services/api"; //Es la funcion proveniente del backend (backend -> services(react(api.js)) -> Register.jsx)

function Register({ onRegistered }) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    profilePictureUrl: "",
  });
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
      await createUser(form);
      onRegistered(); // vuelve a la pantalla de login
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <h2 className={styles.title}>REGISTRO</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            name="email"
            placeholder="ejemplo@correo.com"
            onChange={handleChange}
          />
          <input
            className={styles.input}
            type="text"
            name="name"
            placeholder="Nombre"
            onChange={handleChange}
          />
          <input
            className={styles.input}
            type="password"
            name="password"
            placeholder="Contraseña"
            onChange={handleChange}
          />
          <input
            className={styles.input}
            name="profilePictureUrl"
            placeholder="Foto (URL)"
            onChange={handleChange}
          />

          <button className={styles.btnSubmit} type="submit" disabled={loading}>
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

export default Register;
