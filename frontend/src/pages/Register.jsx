import styles from "./Register.module.css";
import AvatarPicker from "../components/global/AvatarPicker";

import { useEffect, useState } from "react";
import { createUser } from "../services/api";

const EXIT_DELAY_MS = 520;

function Register({ onRegistered, onGoLogin }) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    profilePictureUrl: "",
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({
    email: null,
    name: null,
    password: null,
  });
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const assignFieldError = (message) => {
    const normalized = message.toLowerCase();

    if (normalized.includes("email")) {
      setFieldErrors((current) => ({ ...current, email: message }));
      return;
    }

    if (normalized.includes("nombre")) {
      setFieldErrors((current) => ({ ...current, name: message }));
      return;
    }

    if (normalized.includes("contrasena")) {
      setFieldErrors((current) => ({ ...current, password: message }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({ ...current, [name]: value }));

    if (name in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [name]: null }));
    }

    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({ email: null, name: null, password: null });
    setLoading(true);

    try {
      const createdUser = await createUser(form);
      setIsExiting(true);
      window.setTimeout(() => {
        onRegistered(createdUser);
      }, EXIT_DELAY_MS);
    } catch (err) {
      const message = err.message || "Error al registrar el usuario";
      assignFieldError(message);
      setError(message);
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
        <h2 className={styles.title}>REGISTRO</h2>
        <form className={styles.form} onSubmit={handleSubmit} autoComplete="off">
          <div
            className={`${styles.inputFrame} ${fieldErrors.email ? styles.inputFrameError : ""}`}
          >
            <input
              className={styles.input}
              type="email"
              name="email"
              placeholder="ejemplo@correo.com"
              value={form.email}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
            />
          </div>
          {fieldErrors.email && (
            <p className={styles.fieldError}>{fieldErrors.email}</p>
          )}

          <div
            className={`${styles.inputFrame} ${fieldErrors.name ? styles.inputFrameError : ""}`}
          >
            <input
              className={styles.input}
              type="text"
              name="name"
              placeholder="Nombre"
              value={form.name}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.name)}
              autoComplete="nickname"
            />
          </div>
          {fieldErrors.name && (
            <p className={styles.fieldError}>{fieldErrors.name}</p>
          )}

          <div
            className={`${styles.inputFrame} ${fieldErrors.password ? styles.inputFrameError : ""}`}
          >
            <input
              className={styles.input}
              type="password"
              name="password"
              placeholder="Contrasena"
              value={form.password}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.password)}
              autoComplete="new-password"
            />
          </div>
          {fieldErrors.password && (
            <p className={styles.fieldError}>{fieldErrors.password}</p>
          )}

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

        <div className={styles.links}>
          <p>
            Ya tienes cuenta?{" "}
            <button
              className={styles.btnLink}
              onClick={() => {
                setIsExiting(true);
                window.setTimeout(() => {
                  onGoLogin();
                }, EXIT_DELAY_MS);
              }}
            >
              Iniciar sesion
            </button>
          </p>
        </div>
      </div>

      {showPicker && (
        <AvatarPicker
          currentUrl={form.profilePictureUrl}
          onSelect={(url) =>
            setForm((current) => ({ ...current, profilePictureUrl: url }))
          }
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

export default Register;
