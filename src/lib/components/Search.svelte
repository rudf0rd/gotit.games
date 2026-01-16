<script lang="ts">
  import { useConvexClient } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import GameCard from './GameCard.svelte'
  import type { Id, Doc } from '../../../convex/_generated/dataModel'

  interface Props {
    onGameClick?: (gameId: Id<"games">) => void
  }

  let { onGameClick }: Props = $props()

  const convex = useConvexClient()

  let searchQuery = $state("")
  let debouncedQuery = $state("")
  let isLoading = $state(false)
  let searchResults = $state<Doc<"games">[]>([])

  // Debounce search input
  $effect(() => {
    const query = searchQuery.trim()
    const timer = setTimeout(() => {
      debouncedQuery = query
    }, 300)
    return () => clearTimeout(timer)
  })

  // Perform fuzzy search when debounced query changes
  $effect(() => {
    const query = debouncedQuery
    if (!query || query.length < 2) {
      searchResults = []
      return
    }

    isLoading = true
    convex.action(api.games.fuzzySearch, { query, limit: 20 })
      .then((results) => {
        searchResults = results
      })
      .catch((err) => {
        console.error("Search error:", err)
        searchResults = []
      })
      .finally(() => {
        isLoading = false
      })
  })

  let isSearching = $derived(searchQuery.trim() !== "" && (searchQuery.trim() !== debouncedQuery || isLoading))
  let hasResults = $derived(searchResults.length > 0)
  let showEmpty = $derived(debouncedQuery && !isSearching && searchResults.length === 0)

  // Fun rotating tips for idle state
  const tips = [
    "PRO TIP: SEARCH BEFORE YOU BUY",
    "LOADING WALLET PROTECTION SYSTEMS...",
    "SCANNING FOR DEALS YOU ALREADY OWN...",
    "YOUR BACKLOG CALLED. IT MISSES YOU.",
    "REMEMBER: HUMBLE BUNDLES COUNT TOO",
    "STOP BUYING GAMES YOU ALREADY HAVE",
    "CHECK YOUR SUBS BEFORE CHECKOUT",
    "INSERT QUERY TO CONTINUE",
  ]
  let tipIndex = $state(0)

  $effect(() => {
    const interval = setInterval(() => {
      tipIndex = (tipIndex + 1) % tips.length
    }, 3000)
    return () => clearInterval(interval)
  })
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

  <!-- Status bar - shows searching state -->
  <div class="status-bar">
    {#if isSearching}
      <span class="status-searching">◐ SEARCHING...</span>
    {:else if hasResults}
      <span class="status-results">{searchResults.length} GAMES FOUND</span>
    {:else if showEmpty}
      <span class="status-empty">NO MATCHES</span>
    {:else}
      <span class="status-idle">READY</span>
    {/if}
  </div>

  <!-- Results area with consistent min-height to prevent layout jumps -->
  <div class="results-area">
    {#if !searchQuery.trim()}
      <!-- Idle state - arcade attract mode -->
      <div class="idle-state">
        <div class="arcade-screen">
          <div class="scanlines"></div>
          <div class="screen-content">
            <div class="terminal-box">
              <div class="terminal-title">GAME LOOKUP TERMINAL v1.0</div>
              <div class="terminal-divider"></div>
              <div class="terminal-logo">got it<span class="dot">.</span>games</div>
              <div class="terminal-tagline">NEVER BUY WHAT YOU ALREADY OWN</div>
            </div>
            <div class="prompt">
              <span class="cursor">▶</span> AWAITING INPUT...
            </div>
            <div class="rotating-tip">
              {tips[tipIndex]}
            </div>
            <div class="suggestions">
              <button type="button" class="suggestion" onclick={() => searchQuery = "Starfield"}>STARFIELD</button>
              <button type="button" class="suggestion" onclick={() => searchQuery = "Hollow Knight"}>HOLLOW KNIGHT</button>
              <button type="button" class="suggestion" onclick={() => searchQuery = "Halo"}>HALO</button>
              <button type="button" class="suggestion" onclick={() => searchQuery = "God of War"}>GOD OF WAR</button>
            </div>
          </div>
        </div>
      </div>
    {:else if hasResults}
      <!-- Results -->
      <div class="search-results">
        <div class="results-grid">
          {#each searchResults as game (game._id)}
            <GameCard {game} onClick={onGameClick} />
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

  .status-bar {
    display: flex;
    justify-content: center;
    padding: 0.5rem;
    font-size: 8px;
    min-height: 1.5em;
  }

  .status-searching {
    color: var(--accent);
    animation: pulse 0.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .status-results {
    color: var(--secondary);
  }

  .status-empty {
    color: var(--primary);
  }

  .status-idle {
    color: var(--text-dim);
  }

  .results-area {
    margin-top: 1rem;
    min-height: 380px;
  }

  .idle-state {
    text-align: center;
    color: var(--text-dim);
  }

  .arcade-screen {
    background: linear-gradient(180deg, #0a0a12 0%, #1a1a2e 100%);
    border: 3px solid var(--secondary);
    border-radius: 8px;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    min-height: 340px;
    box-shadow:
      inset 0 0 60px rgba(0, 255, 255, 0.1),
      0 0 20px rgba(0, 255, 255, 0.2);
  }

  .scanlines {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.3) 2px,
      rgba(0, 0, 0, 0.3) 4px
    );
    pointer-events: none;
    z-index: 1;
  }

  .screen-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .terminal-box {
    border: 2px solid var(--secondary);
    padding: 1rem 2rem;
    text-align: center;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }

  .terminal-title {
    font-size: 10px;
    color: var(--accent);
    text-shadow: 0 0 5px var(--accent);
    margin-bottom: 0.75rem;
    letter-spacing: 1px;
  }

  .terminal-divider {
    height: 2px;
    background: var(--secondary);
    margin: 0.5rem 0;
    box-shadow: 0 0 5px var(--secondary);
  }

  .terminal-logo {
    font-size: 16px;
    color: var(--primary);
    text-shadow: 0 0 10px var(--primary);
    margin: 1rem 0;
  }

  .terminal-logo .dot {
    color: var(--secondary);
  }

  .terminal-tagline {
    font-size: 8px;
    color: var(--text);
    letter-spacing: 1px;
  }

  .prompt {
    font-size: 10px;
    color: var(--primary);
    text-shadow: 0 0 10px var(--primary);
    animation: flicker 3s infinite;
  }

  .cursor {
    animation: blink 1s infinite;
    margin-right: 0.5rem;
  }

  @keyframes flicker {
    0%, 100% { opacity: 1; }
    92% { opacity: 1; }
    93% { opacity: 0.8; }
    94% { opacity: 1; }
    95% { opacity: 0.9; }
    96% { opacity: 1; }
  }

  .rotating-tip {
    font-size: 8px;
    color: var(--accent);
    text-shadow: 0 0 5px var(--accent);
    min-height: 1.5em;
    text-align: center;
    animation: tipFade 3s infinite;
  }

  @keyframes tipFade {
    0%, 100% { opacity: 1; }
    45% { opacity: 1; }
    50% { opacity: 0; }
    55% { opacity: 1; }
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .suggestion {
    font-size: 8px;
    padding: 0.4rem 0.8rem;
    background: transparent;
    border: 1px solid var(--text-dim);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Press Start 2P', monospace;
  }

  .suggestion:hover {
    border-color: var(--primary);
    color: var(--primary);
    box-shadow: 0 0 10px var(--primary);
    text-shadow: 0 0 5px var(--primary);
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .search-results {
    margin-top: 0;
    min-height: 340px;
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
    min-height: 300px;
  }

  .no-results p {
    margin: 0.5rem 0;
  }

  .no-results .hint {
    font-size: 8px;
  }
</style>
