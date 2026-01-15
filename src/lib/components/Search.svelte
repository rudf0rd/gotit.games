<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import GameCard from './GameCard.svelte'

  let searchQuery = $state("")
  let debouncedQuery = $state("")

  // Debounce search input
  $effect(() => {
    const query = searchQuery.trim()
    const timer = setTimeout(() => {
      debouncedQuery = query
    }, 300)
    return () => clearTimeout(timer)
  })

  // Search for games - need to read debouncedQuery in a reactive way
  const getArgs = () => {
    const q = debouncedQuery
    return q ? { query: q } : 'skip'
  }

  const searchResults = useQuery(api.games.search, getArgs)

  let isSearching = $derived(searchQuery.trim() !== "" && searchQuery.trim() !== debouncedQuery)
  let hasResults = $derived(searchResults.data && searchResults.data.length > 0)
  let showEmpty = $derived(debouncedQuery && !isSearching && searchResults.data?.length === 0)

</script>

<div class="search-container">
  <div class="search-box">
    <span class="search-icon">🔍</span>
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="SEARCH GAMES..."
      class="search-input"
    />
    {#if searchQuery}
      <button class="clear-btn" onclick={() => searchQuery = ""}>×</button>
    {/if}
  </div>

  <!-- Results area with consistent min-height to prevent layout jumps -->
  <div class="results-area">
    {#if !searchQuery.trim()}
      <!-- Idle state - show hint -->
      <div class="idle-state">
        <p>TYPE TO SEARCH</p>
        <p class="hint">TRY "STARFIELD" OR "HOLLOW KNIGHT"</p>
      </div>
    {:else if isSearching || searchResults.isLoading}
      <!-- Loading state -->
      <div class="search-status">
        <span class="loading">SEARCHING...</span>
      </div>
    {:else if hasResults}
      <!-- Results -->
      <div class="search-results">
        <div class="result-count">{searchResults.data?.length} GAMES FOUND</div>
        <div class="results-grid">
          {#each searchResults.data ?? [] as game (game._id)}
            <GameCard {game} />
          {/each}
        </div>
      </div>
    {:else if showEmpty}
      <!-- No results -->
      <div class="no-results">
        <p>NO GAMES FOUND</p>
        <p class="hint">TRY A DIFFERENT SEARCH</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .search-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  .search-box {
    display: flex;
    align-items: center;
    background: var(--bg-dark);
    border: 2px solid var(--secondary);
    padding: 0.5rem 1rem;
    gap: 0.5rem;
  }

  .search-box:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 10px var(--primary);
  }

  .search-icon {
    font-size: 14px;
    filter: grayscale(1);
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text);
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    outline: none;
  }

  .search-input::placeholder {
    color: var(--text-dim);
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
  }

  .clear-btn:hover {
    color: var(--primary);
  }

  .results-area {
    margin-top: 1rem;
    min-height: 120px;
  }

  .idle-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-dim);
  }

  .idle-state p {
    margin: 0.5rem 0;
  }

  .idle-state .hint {
    font-size: 8px;
    color: var(--secondary);
  }

  .search-status {
    text-align: center;
    padding: 2rem;
  }

  .loading {
    font-size: 10px;
    color: var(--secondary);
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .search-results {
    margin-top: 1rem;
  }

  .result-count {
    font-size: 8px;
    color: var(--text-dim);
    margin-bottom: 1rem;
    text-align: center;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .no-results {
    margin-top: 2rem;
    text-align: center;
    color: var(--text-dim);
  }

  .no-results p {
    margin: 0.5rem 0;
  }

  .no-results .hint {
    font-size: 8px;
  }
</style>
