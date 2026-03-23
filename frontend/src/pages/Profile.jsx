//import "./Profile.css";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "../services/api";

function Profile({ user, onProfileUpdated }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user.name,
    profilePictureUrl: user.profilePictureUrl || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
    <div className="profile-container">
      <button className="profile-button" onClick={() => navigate("/")}>
        ← Volver
      </button>

      <h2>Mi perfil</h2>

      <div className="profile-card">
        {/* Datos de solo lectura */}
        <div className="profile-section">
          <h3>Información</h3>
          <div className="profile-item">
            <span className="profile-label">Email:</span>
            <span className="profile-value">{user.email}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">Puntuación:</span>
            <span className="profile-value">{user.score} pts</span>
          </div>
        </div>

        {/* Vista previa del avatar */}
        <div className="profile-section">
          <h3>Avatar</h3>
          {form.profilePictureUrl ? (
            <img
              src={form.profilePictureUrl}
              alt="Vista previa"
              style={{
                width: 80,
                height: 80,
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Formulario de edición */}
        <form className="profile-section" onSubmit={handleSubmit}>
          <h3>Editar perfil</h3>
          <div>
            <label>Nombre de usuario</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>URL de foto de perfil</label>
            <input
              type="text"
              name="profilePictureUrl"
              value={form.profilePictureUrl}
              placeholder="https://..."
              onChange={handleChange}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>

        {error && <p style={{ color: "red" }}>{error}</p>}
        {success && (
          <p style={{ color: "green" }}>Perfil actualizado correctamente.</p>
        )}
      </div>
    </div>
  );
}

export default Profile;
