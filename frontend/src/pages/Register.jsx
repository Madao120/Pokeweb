import { useState } from "react"; //UseState, sirve para manejar estados en componentes funcionales
import { createUser } from "../services/api"; //Es la funcion proveniente del backend (backend -> services(react(api.js)) -> Register.jsx)

function Register() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    profilePictureUrl: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = await createUser(form);
      alert("Usuario creado con id " + user.id);
    } catch (err) {
      alert("Error al crear usuario", err);
    }
  };

  return (
    <div>
      <h2>Registro</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="ejemplo@correo.com"
          onChange={handleChange}
        />
        <input
          type="text"
          name="name"
          placeholder="Nombre"
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          onChange={handleChange}
        />
        <input
          name="profilePictureUrl"
          placeholder="Foto (URL)"
          onChange={handleChange}
        />

        <button type="submit">Registrarse</button>
      </form>
    </div>
  );
}

export default Register;
