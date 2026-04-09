import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5180/api/v2";
const PAGE_SIZE = 12;

function App() {
  const [pokemons, setPokemons] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadPokemons() {
      setLoading(true);
      setError("");

      try {
        if (submittedSearch.trim()) {
          const response = await fetch(`${API_BASE_URL}/pokemon/${submittedSearch.trim().toLowerCase()}`);

          if (response.status === 404) {
            throw new Error("No se ha encontrado ningún Pokémon con ese nombre.");
          }

          if (!response.ok) {
            throw new Error("No se pudo cargar el Pokémon solicitado.");
          }

          const pokemon = await response.json();

          if (!ignore) {
            setPokemons([
              {
                id: pokemon.id,
                name: pokemon.name,
                image: getPokemonImage(pokemon.id),
              },
            ]);
            setCount(1);
          }

          return;
        }

        const offset = (page - 1) * PAGE_SIZE;
        const response = await fetch(`${API_BASE_URL}/pokemon?limit=${PAGE_SIZE}&offset=${offset}`);

        if (!response.ok) {
          throw new Error("No se pudo cargar el listado de Pokémon.");
        }

        const data = await response.json();
        const mapped = data.results.map((pokemon) => {
          const id = extractPokemonId(pokemon.url);

          return {
            id,
            name: pokemon.name,
            image: getPokemonImage(id),
          };
        });

        if (!ignore) {
          setPokemons(mapped);
          setCount(data.count);
        }
      } catch (err) {
        if (!ignore) {
          setPokemons([]);
          setCount(0);
          setError(err instanceof Error ? err.message : "Se ha producido un error inesperado.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPokemons();

    return () => {
      ignore = true;
    };
  }, [page, submittedSearch]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const isSearchMode = submittedSearch.trim().length > 0;

  function handleSubmit(event) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search);
  }

  function handleReset() {
    setSearch("");
    setSubmittedSearch("");
    setPage(1);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <h1 className="eyebrow">Pokédex local</h1>
      </section>

      <section className="toolbar">
        <form className="search-form" onSubmit={handleSubmit}>
          <label className="search-label" htmlFor="pokemon-search">
            Buscar por nombre
          </label>
          <div className="search-row">
            <input
              id="pokemon-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ejemplo: pikachu"
            />
            <button type="submit">Buscar</button>
            <button type="button" className="secondary" onClick={handleReset}>
              Limpiar
            </button>
          </div>
        </form>

        <div className="summary-card">
          <span>API base</span>
          <code>{API_BASE_URL}</code>
        </div>
      </section>

      {error ? <div className="feedback error">{error}</div> : null}
      {loading ? <div className="feedback">Cargando Pokémon...</div> : null}

      {!loading && !error ? (
        <>
          <section className="results-meta">
            <p>
              {isSearchMode
                ? `Resultado para "${submittedSearch}".`
                : `Página ${page} de ${totalPages}. Total de Pokémon: ${count}.`}
            </p>
          </section>

          <section className="grid">
            {pokemons.map((pokemon) => (
              <article key={`${pokemon.name}-${pokemon.id ?? "unknown"}`} className="card">
                <div className="sprite-wrap">
                  {pokemon.image ? (
                    <img src={pokemon.image} alt={pokemon.name} loading="lazy" />
                  ) : (
                    <div className="sprite-fallback">?</div>
                  )}
                </div>
                <p className="pokemon-id">{pokemon.id ? `#${String(pokemon.id).padStart(4, "0")}` : "Sin ID"}</p>
                <h2>{formatPokemonName(pokemon.name)}</h2>
              </article>
            ))}
          </section>

          {!isSearchMode ? (
            <nav className="pagination" aria-label="Paginación de Pokémon">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                Anterior
              </button>
              <span>
                Página <strong>{page}</strong> / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function extractPokemonId(url) {
  const match = url.match(/\/pokemon\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function getPokemonImage(id) {
  if (!id) {
    return "";
  }

  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function formatPokemonName(name) {
  if (!name) {
    return "";
  }

  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default App;
