const DEFAULT_API_URL = "http://localhost:8080";
const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(
  /\/+$/,
  "",
);

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

// Crear usuario nuevo
export async function createUser(user) {
  const response = await fetch(buildApiUrl("/users"), {
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
  const response = await fetch(buildApiUrl("/auth/login"), {
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
  const response = await fetch(buildApiUrl(`/users/${userId}`));
  if (!response.ok) {
    throw new Error("Error al obtener el usuario");
  }
  return await response.json();
}

// Editar nombre y foto de perfil
export async function updateProfile(userId, data) {
  const response = await fetch(buildApiUrl(`/users/${userId}/profile`), {
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
  const response = await fetch(buildApiUrl(`/game/start?userId=${userId}`), {
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
    buildApiUrl(
      `/game/guess?userId=${userId}&letra=${encodeURIComponent(letra)}`,
    ),
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
    buildApiUrl(
      `/game/guess-word?userId=${userId}&palabra=${encodeURIComponent(palabra)}`,
    ),
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
  const response = await fetch(buildApiUrl(`/game/abandon?userId=${userId}`), {
    method: "POST",
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error("Error al abandonar la partida");
  }
}

export async function forceLoseGame(userId) {
  const response = await fetch(buildApiUrl(`/game/force-lose?userId=${userId}`), {
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
    buildApiUrl(`/users/${userId}/score?score=${score}`),
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
  const response = await fetch(buildApiUrl(`/users/ranking${query}`));
  if (!response.ok) throw new Error("Error al obtener el ranking");
  return await response.json();
}

export async function getGlobalRanking(userId) {
  const query = userId ? `?userId=${userId}` : "";
  const response = await fetch(buildApiUrl(`/users/rankings/global${query}`));
  if (!response.ok) throw new Error("Error al obtener el ranking global");
  return await response.json();
}

export async function startGuessSoundGame(userId) {
  const response = await fetch(buildApiUrl(`/game/m2/start?userId=${userId}`), {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Error al iniciar GuessSound");
  }
  return await response.json();
}

export async function guessSoundPokemon(userId, pokemonId) {
  const response = await fetch(
    buildApiUrl(`/game/m2/guess?userId=${userId}&pokemonId=${pokemonId}`),
    { method: "POST" },
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error al responder ronda");
  }
  return await response.json();
}

export async function abandonGuessSoundGame(userId) {
  const response = await fetch(buildApiUrl(`/game/m2/abandon?userId=${userId}`), {
    method: "POST",
    keepalive: true,
  });
  if (!response.ok) {
    throw new Error("Error al abandonar GuessSound");
  }
}

export async function forceLoseGuessSoundGame(userId) {
  const response = await fetch(
    buildApiUrl(`/game/m2/force-lose?userId=${userId}`),
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error("Error al forzar derrota en GuessSound");
  }
  return await response.json();
}

export async function getRankingM2(userId) {
  const query = userId ? `?userId=${userId}` : "";
  const response = await fetch(buildApiUrl(`/users/rankings/m2${query}`));
  if (!response.ok) throw new Error("Error al obtener ranking M2");
  return await response.json();
}

export async function startGuessSpriteGame(userId) {
  const response = await fetch(buildApiUrl(`/game/m3/start?userId=${userId}`), {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Error al iniciar GuessSprite");
  }
  return await response.json();
}

export async function guessSpritePokemon(userId, pokemonId) {
  const response = await fetch(
    buildApiUrl(`/game/m3/guess?userId=${userId}&pokemonId=${pokemonId}`),
    { method: "POST" },
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error al responder GuessSprite");
  }
  return await response.json();
}

export async function abandonGuessSpriteGame(userId) {
  const response = await fetch(buildApiUrl(`/game/m3/abandon?userId=${userId}`), {
    method: "POST",
    keepalive: true,
  });
  if (!response.ok) {
    throw new Error("Error al abandonar GuessSprite");
  }
}

export async function forceLoseGuessSpriteGame(userId) {
  const response = await fetch(
    buildApiUrl(`/game/m3/force-lose?userId=${userId}`),
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error("Error al forzar derrota en GuessSprite");
  }
  return await response.json();
}

export async function getRankingM3(userId) {
  const query = userId ? `?userId=${userId}` : "";
  const response = await fetch(buildApiUrl(`/users/rankings/m3${query}`));
  if (!response.ok) throw new Error("Error al obtener ranking M3");
  return await response.json();
}

export async function getGuessSpritePokemonList() {
  const response = await fetch(buildApiUrl("/game/m3/pokemon-list"));
  if (!response.ok) throw new Error("Error al obtener lista de Pokemon M3");
  return await response.json();
}

export async function getDailyHangmanState(userId) {
  const response = await fetch(
    buildApiUrl(`/game/daily/m1/state?userId=${userId}`),
  );
  if (!response.ok) throw new Error("Error al obtener estado diario M1");
  return await response.json();
}

export async function startDailyHangman(userId) {
  const response = await fetch(
    buildApiUrl(`/game/daily/m1/start?userId=${userId}`),
    {
      method: "POST",
    },
  );
  if (!response.ok) throw new Error("Error al iniciar diario M1");
  return await response.json();
}

export async function guessDailyHangmanLetter(userId, letra) {
  const response = await fetch(
    buildApiUrl(
      `/game/daily/m1/guess-letter?userId=${userId}&letra=${encodeURIComponent(letra)}`,
    ),
    { method: "POST" },
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error al enviar letra diaria");
  }
  return await response.json();
}

export async function guessDailyHangmanWord(userId, palabra) {
  const response = await fetch(
    buildApiUrl(
      `/game/daily/m1/guess-word?userId=${userId}&palabra=${encodeURIComponent(palabra)}`,
    ),
    { method: "POST" },
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error al enviar palabra diaria");
  }
  return await response.json();
}

export async function getDailySpriteState(userId) {
  const response = await fetch(
    buildApiUrl(`/game/daily/m3/state?userId=${userId}`),
  );
  if (!response.ok) throw new Error("Error al obtener estado diario M3");
  return await response.json();
}

export async function startDailySprite(userId) {
  const response = await fetch(
    buildApiUrl(`/game/daily/m3/start?userId=${userId}`),
    {
      method: "POST",
    },
  );
  if (!response.ok) throw new Error("Error al iniciar diario M3");
  return await response.json();
}

export async function guessDailySprite(userId, pokemonId) {
  const response = await fetch(
    buildApiUrl(`/game/daily/m3/guess?userId=${userId}&pokemonId=${pokemonId}`),
    { method: "POST" },
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error al responder sprite diario");
  }
  return await response.json();
}

export async function createMultiplayerRoom(userId, password) {
  const response = await fetch(buildApiUrl("/rooms"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido crear la sala");
  }

  return await response.json();
}

export async function joinMultiplayerRoom(code, userId, password) {
  const response = await fetch(buildApiUrl(`/rooms/${code}/join`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido unir a la sala");
  }

  return await response.json();
}

export async function getMultiplayerRoomState(code, userId) {
  const response = await fetch(buildApiUrl(`/rooms/${code}?userId=${userId}`));

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido recuperar la sala");
  }

  return await response.json();
}

export async function voteMultiplayerMode(code, userId, mode) {
  const response = await fetch(buildApiUrl(`/rooms/${code}/vote-mode`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, mode }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido registrar el voto");
  }

  return await response.json();
}

export async function startMultiplayerRound(code, userId, mode) {
  const response = await fetch(
    buildApiUrl(`/rooms/${code}/start?userId=${userId}&mode=${encodeURIComponent(mode)}`),
    { method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido iniciar la ronda");
  }

  return await response.json();
}

export async function guessMultiplayerLetter(code, userId, letra) {
  const response = await fetch(
    buildApiUrl(
      `/rooms/${code}/guess-letter?userId=${userId}&letra=${encodeURIComponent(letra)}`,
    ),
    { method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido enviar la letra");
  }

  return await response.json();
}

export async function guessMultiplayerWord(code, userId, palabra) {
  const response = await fetch(
    buildApiUrl(
      `/rooms/${code}/guess-word?userId=${userId}&palabra=${encodeURIComponent(palabra)}`,
    ),
    { method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido enviar la palabra");
  }

  return await response.json();
}

export async function repeatMultiplayerRound(code, leaderId) {
  const response = await fetch(
    buildApiUrl(`/rooms/${code}/repeat?leaderId=${leaderId}`),
    { method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido repetir la ronda");
  }

  return await response.json();
}

export async function changeMultiplayerMode(code, leaderId) {
  const response = await fetch(
    buildApiUrl(`/rooms/${code}/change-mode?leaderId=${leaderId}`),
    { method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido volver a la sala");
  }

  return await response.json();
}

export async function finishMultiplayerGame(code, leaderId) {
  const response = await fetch(
    buildApiUrl(`/rooms/${code}/finish?leaderId=${leaderId}`),
    { method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido terminar la partida");
  }

  return await response.json();
}

export async function kickMultiplayerPlayer(code, leaderId, targetId) {
  const response = await fetch(buildApiUrl(`/rooms/${code}/kick`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leaderId, targetId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido expulsar al jugador");
  }

  return await response.json();
}

export async function transferMultiplayerLeader(code, currentLeaderId, newLeaderId) {
  const response = await fetch(buildApiUrl(`/rooms/${code}/leader`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentLeaderId, newLeaderId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se ha podido transferir el liderazgo");
  }

  return await response.json();
}
