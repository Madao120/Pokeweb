import { useState, useEffect } from "react";
import styles from "./AvatarPicker.module.css";

// Lista de pokemon para el buscador (cacheada en memoria)
const TOTAL_POKEMON = 1025;
const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

let cachedNames = null;

async function fetchPokemonNames() {
  if (cachedNames) return cachedNames;

  try {
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon?limit=${TOTAL_POKEMON}`,
    );
    const data = await res.json();
    cachedNames = data.results.map((p, i) => ({
      id: i + 1,
      name: p.name,
      sprite: `${SPRITE_BASE}/${i + 1}.png`,
    }));
  } catch {
    cachedNames = Array.from({ length: TOTAL_POKEMON }, (_, i) => ({
      id: i + 1,
      name: `#${i + 1}`,
      sprite: `${SPRITE_BASE}/${i + 1}.png`,
    }));
  }

  return cachedNames;
}

function AvatarPicker({ currentUrl, onSelect, onClose }) {
  const [pokemon, setPokemon] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(currentUrl || "");
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetchPokemonNames().then((list) => {
      setPokemon(list);
      setFiltered(list);
      setLoadingList(false);
    });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(pokemon);
      return;
    }

    setFiltered(
      pokemon.filter((p) => p.name.includes(q) || String(p.id).includes(q)),
    );
  }, [search, pokemon]);

  const handleConfirm = () => {
    if (selected) onSelect(selected);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Elige tu avatar</span>
          <button className={styles.btnClose} onClick={onClose} type="button">
            {"\u2715"}
          </button>
        </div>

        <input
          className={styles.searchInput}
          type="text"
          placeholder="Buscar por nombre o numero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {loadingList ? (
          <p className={styles.loadingMsg}>Cargando pokemon...</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.cell} ${selected === p.sprite ? styles.cellSelected : ""}`}
                onClick={() => setSelected(p.sprite)}
                title={p.name}
              >
                <img
                  src={p.sprite}
                  alt={p.name}
                  className={styles.sprite}
                  loading="lazy"
                />
                <span className={styles.cellName}>{p.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className={styles.noResults}>Sin resultados para "{search}"</p>
            )}
          </div>
        )}

        <div className={styles.footer}>
          {selected && (
            <div className={styles.preview}>
              <img
                src={selected}
                alt="seleccionado"
                className={styles.previewImg}
              />
              <span className={styles.previewLabel}>Seleccionado</span>
            </div>
          )}
          <button
            className={styles.btnConfirm}
            onClick={handleConfirm}
            type="button"
            disabled={!selected}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarPicker;
