import styles from "./Profile.module.css";
import AvatarPicker from "../components/global/AvatarPicker";

import { useEffect, useState } from "react";
import { updateProfile } from "../services/api";

function Profile({ user, onProfileUpdated }) {
  const [form, setForm] = useState({
    name: user.name,
    profilePictureUrl: user.profilePictureUrl || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
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
    setSuccess(false);
    setLoading(true);

    try {
      const updated = await updateProfile(user.id, form);
      onProfileUpdated(updated);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.page} ${isVisible ? styles.pageVisible : ""}`}>
      <div className={`${styles.panel} ${isVisible ? styles.panelVisible : ""}`}>
        <h2 className={styles.title}>MI PERFIL</h2>

        <div className={styles.infoGrid}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoVal}>{user.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Puntuación Global</span>
            <span className={styles.infoVal}>{user.globalScore} pts</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Ahorcado (M1)</span>
            <span className={styles.infoVal}>{user.scoreM1} pts</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>GuessSound (M2)</span>
            <span className={styles.infoVal}>{user.scoreM2} pts</span>
          </div>
        </div>

        <div className={styles.avatarSection}>
          {form.profilePictureUrl ? (
            <img
              src={form.profilePictureUrl}
              alt="avatar"
              className={styles.avatarPreview}
            />
          ) : (
            <div className={styles.avatarEmpty}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            className={styles.btnPicker}
            onClick={() => setShowPicker(true)}
          >
            {form.profilePictureUrl ? "Cambiar avatar" : "Elegir avatar"}
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>Nombre de usuario</label>
          <div className={styles.inputFrame}>
            <input
              className={styles.input}
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </div>
          <button className={styles.btnSubmit} type="submit" disabled={loading}>
            {loading ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
        {success && (
          <p className={styles.success}>Perfil actualizado correctamente.</p>
        )}
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

export default Profile;
