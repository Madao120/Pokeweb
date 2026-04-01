# Temas alternativos (no aplicados por defecto)

Estos archivos guardan el tema azul estilo Pokédex 5ª gen para que puedas aplicarlo cuando quieras sin sobrescribir el estilo actual:

- `pokedexBlueTokens.css` → variables globales y base visual.
- `pokedexBlueApp.css` → fondo animado tipo HUD para `App`.
- `../pages/GuessPokemonPokedexBlue.module.css` → estilo completo de `GuessPokemon`.

## Cómo activarlo
1. Copia el contenido de `pokedexBlueTokens.css` a `src/index.css`.
2. Copia el contenido de `pokedexBlueApp.css` a `src/App.css`.
3. En `GuessPokemon.jsx`, cambia el import:
   - de `./GuessPokemon.module.css`
   - a `./GuessPokemonPokedexBlue.module.css`