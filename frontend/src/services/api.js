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

// Para obtener los datos del usuario
export async function getUser(userId) {
  const response = await fetch(`${API_URL}/users/${userId}`);
  if (!response.ok) {
    throw new Error("Error al obtener el usuario");
  }
  return await response.json();
}

// Editar nombre y foto de perfil
export async function updateProfile(userId, data) {
  const response = await fetch(`${API_URL}/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
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
    `${API_URL}/game/guess?userId=${userId}&letra=${encodeURIComponent(letra)}`,
    { method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error al enviar la letra");
  }

  return await response.json();
}

// Enviar la palabra completa al backend
export async function guessWord(userId, palabra) {
  const response = await fetch(
    `${API_URL}/game/guess-word?userId=${userId}&palabra=${encodeURIComponent(palabra)}`,
    { method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error al enviar la palabra");
  }

  return await response.json();
}

// Abandonar partida activa (penalizacion -25 en backend)
export async function abandonGame(userId) {
  const response = await fetch(`${API_URL}/game/abandon?userId=${userId}`, {
    method: "POST",
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error("Error al abandonar la partida");
  }
}

export async function forceLoseGame(userId) {
  const response = await fetch(`${API_URL}/game/force-lose?userId=${userId}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Error al forzar derrota");
  }
  return await response.json();
}

// Actualizar puntuacion de un usuario
export async function updateScore(userId, score) {
  const response = await fetch(
    `${API_URL}/users/${userId}/score?score=${score}`,
    { method: "PUT" },
  );

  if (!response.ok) {
    throw new Error("Error al actualizar la puntuacion");
  }

  return await response.json();
}

// Top 10 jugadores por scoreM1
export async function getRanking(userId) {
  const query = userId ? `?userId=${userId}` : "";
  const response = await fetch(`${API_URL}/users/ranking${query}`);
  if (!response.ok) throw new Error("Error al obtener el ranking");
  return await response.json();
}

export async function getGlobalRanking(userId) {
  const query = userId ? `?userId=${userId}` : "";
  const response = await fetch(`${API_URL}/users/rankings/global${query}`);
  if (!response.ok) throw new Error("Error al obtener el ranking global");
  return await response.json();
}
