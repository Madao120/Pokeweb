function ModeSelector({ user }) {
  return (
    <div>
      <h2>Bienvenido, {user.name}</h2>
      <p>Puntuación: {user.score}</p>

      <h3>Elige modo de juego</h3>

      <button>Individual</button>
      <button>Multijugador</button>
    </div>
  );
}

export default ModeSelector;