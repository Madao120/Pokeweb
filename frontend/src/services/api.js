// La ruta por la cual estará el API de backend
const API_URL = "http://localhost:8080";

// Función para crear un usuario que viene del servicio de backend
export async function createUser(user) {
  //Haremos un fetch a API_URL y /users que es el requestParam que he escogido, no hay nada maás en este endpoint
  const response = await fetch(`${API_URL}/users`, {
    method: "POST", //Método post, para crear el usuario
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  //Error por si las validaciones del frontend no son suficientes
  if (!response.ok) {
    throw new Error("Error creating user");
  }

  return await response.json();
}
