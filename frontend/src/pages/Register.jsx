import styles from "./Register.module.css";
import AvatarPicker from "../components/AvatarPicker";

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

  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const createdUser = await createUser(form);
      onRegistered(createdUser);
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
          {/* Selector de avatar */}
          <div className={styles.avatarRow}>
            {form.profilePictureUrl ? (
              <img
                src={form.profilePictureUrl}
                alt="avatar"
                className={styles.avatarPreview}
              />
            ) : (
              <div className={styles.avatarEmpty}>?</div>
            )}
            <button
              type="button"
              className={styles.btnPicker}
              onClick={() => setShowPicker(true)}
            >
              {form.profilePictureUrl ? "Cambiar avatar" : "Elegir avatar"}
            </button>
          </div>

          <button className={styles.btnSubmit} type="submit" disabled={loading}>
            {loading ? "REGISTRANDO..." : "REGISTRARSE"}
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {showPicker && (
        <AvatarPicker
          currentUrl={form.profilePictureUrl}
          onSelect={(url) => setForm({ ...form, profilePictureUrl: url })}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

export default Register;
