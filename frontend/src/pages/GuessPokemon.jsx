import { useState } from "react";
import { getRandomPokemon } from "../services/api";

function GuessPokemon() {

  const [pokemon, setPokemon] = useState(null);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");

  const startGame = async () => {
    const p = await getRandomPokemon();
    setPokemon(p);
    setMessage("");
  };

  const checkGuess = () => {
    if (guess.toLowerCase() === pokemon) {
      setMessage("¡Correcto!");
    } else {
      setMessage("Incorrecto, intenta otra vez");
    }
  };

  return (
    <div>

      <h2>Adivina el Pokémon</h2>

      <button onClick={startGame}>
        Empezar juego
      </button>

      {pokemon && (
        <>
          <input
            placeholder="Tu respuesta"
            onChange={(e) => setGuess(e.target.value)}
          />

          <button onClick={checkGuess}>
            Adivinar
          </button>
        </>
      )}

      <p>{message}</p>

    </div>
  );
}

export default GuessPokemon;