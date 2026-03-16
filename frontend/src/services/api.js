const API_URL = "http://localhost:8080";

// Crear usuario nuevo
export async function createUser(user) {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message);
  }

  return await response.json();
}

// Login
export async function login(credentials) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message);
  }

  return await response.json();
}

// Iniciar partida de ahorcado para un usuario
export async function startGame(userId) {
  const response = await fetch(`${API_URL}/game/start?userId=${userId}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Error al iniciar la partida");
  }

  return await response.json();
}

// Enviar una letra al backend
export async function guessLetter(userId, letra) {
  const response = await fetch(
    `${API_URL}/game/guess?userId=${userId}&letra=${letra}`,
    { method: "POST" },
  );

  if (!response.ok) {
    throw new Error("Error al enviar la letra");
  }

  return await response.json();
}

// Actualizar puntuación de un usuario
export async function updateScore(userId, score) {
  const response = await fetch(
    `${API_URL}/users/${userId}/score?score=${score}`,
    { method: "PUT" },
  );

  if (!response.ok) {
    throw new Error("Error al actualizar la puntuación");
  }

  return await response.json();
}
