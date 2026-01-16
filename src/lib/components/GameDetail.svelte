<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import { useClerkContext } from 'svelte-clerk/client'
  import type { Id } from '../../../convex/_generated/dataModel'

  interface Props {
    gameId: Id<"games">
    onClose: () => void
  }

  let { gameId, onClose }: Props = $props()

  const clerk = useClerkContext()

  // Get game details
  const game = useQuery(api.games.get, () => ({ id: gameId }))

  // Check availability across all services
  const availability = useQuery(
    api.catalog.checkAvailability,
    () => ({ game_id: gameId, user_id: clerk.user?.id })
  )

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  function formatPlatform(platform: string): string {
    const map: Record<string, string> = {
      'pc': 'PC',
      'playstation': 'PlayStation',
      'xbox': 'Xbox',
      'switch': 'Switch'
    }
    return map[platform] ?? platform.toUpperCase()
  }

  function getStatusBadge(status: string): { text: string; class: string } {
    switch (status) {
      case 'available':
        return { text: 'AVAILABLE NOW', class: 'available' }
      case 'coming_soon':
        return { text: 'COMING SOON', class: 'coming' }
      case 'leaving_soon':
        return { text: 'LEAVING SOON', class: 'leaving' }
      default:
        return { text: status.toUpperCase(), class: '' }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="game-overlay" onclick={onClose} role="button" tabindex="-1">
  <div class="game-modal" onclick={(e) => e.stopPropagation()} role="dialog">
    <button class="close-btn" onclick={onClose}>X</button>

    {#if game.data}
      <div class="game-content">
        <div class="game-hero">
          {#if game.data.cover_url}
            <img src={game.data.cover_url} alt={game.data.title} class="cover-large" />
          {:else}
            <div class="cover-large no-cover">NO COVER</div>
          {/if}

          <div class="hero-info">
            <h1 class="game-title">{game.data.title}</h1>

            {#if game.data.release_date}
              <div class="release-date">
                <span class="label">RELEASE DATE</span>
                <span class="value">{formatDate(game.data.release_date)}</span>
              </div>
            {/if}

            {#if game.data.platforms && game.data.platforms.length > 0}
              <div class="platforms">
                <span class="label">PLATFORMS</span>
                <div class="platform-tags">
                  {#each [...new Set(game.data.platforms)] as platform}
                    <span class="platform-tag">{formatPlatform(platform)}</span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Availability status -->
            {#if availability.data}
              <div class="availability-section">
                <span class="label">SUBSCRIPTION STATUS</span>
                {#if availability.data.entries.length > 0}
                  <div class="availability-entries">
                    {#each availability.data.entries as entry}
                      {@const badge = getStatusBadge(entry.status)}
                      <div class="availability-entry {badge.class}" class:user-has={entry.userHasAccess}>
                        <div class="entry-header">
                          <span
                            class="service-name"
                            style="color: {entry.subscription?.color ?? 'var(--text)'}"
                          >
                            {entry.subscription?.name ?? 'Unknown'}
                          </span>
                          <span class="status-badge {badge.class}">{badge.text}</span>
                        </div>
                        <div class="entry-details">
                          <span class="tier">{entry.tier?.name ?? entry.tier_slug}</span>
                          <span class="platform">{entry.platform.toUpperCase()}</span>
                        </div>
                        {#if entry.userHasAccess}
                          <div class="you-have-it">YOU HAVE THIS</div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="not-available">
                    <span class="sad-face">:(</span>
                    <span>NOT IN ANY SUBSCRIPTION SERVICE</span>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        {#if game.data.description}
          <div class="description-section">
            <h2>ABOUT</h2>
            <p class="description">{game.data.description}</p>
          </div>
        {/if}

        <!-- Stats section - quirky fake stats for fun -->
        <div class="stats-section">
          <h2>VITAL STATS</h2>
          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-value">{Math.floor(Math.random() * 50 + 10)}h</span>
              <span class="stat-label">AVG PLAYTIME</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{Math.floor(Math.random() * 30 + 70)}%</span>
              <span class="stat-label">COMPLETION RATE</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{(Math.random() * 2 + 3).toFixed(1)}</span>
              <span class="stat-label">BACKLOG MONTHS</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{Math.floor(Math.random() * 5 + 1)}</span>
              <span class="stat-label">TIMES WISHLISTED</span>
            </div>
          </div>
        </div>

        <div class="game-id">
          <span class="label">IGDB ID:</span>
          <span class="value">{game.data.igdb_id ?? 'N/A'}</span>
        </div>
      </div>
    {:else}
      <div class="loading">LOADING GAME DATA...</div>
    {/if}
  </div>
</div>

<style>
  .game-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
    overflow-y: auto;
    padding: 2rem;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .game-modal {
    width: 100%;
    max-width: 800px;
    background: var(--bg-dark);
    border: 3px solid var(--secondary);
    position: relative;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 30px;
    height: 30px;
    background: var(--bg);
    border: 2px solid var(--text-dim);
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .close-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .game-content {
    padding: 2rem;
  }

  .game-hero {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .cover-large {
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border: 2px solid var(--secondary);
  }

  .cover-large.no-cover {
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 10px;
  }

  .hero-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .game-title {
    font-size: 18px;
    margin: 0;
    color: var(--primary);
    text-shadow: 0 0 10px var(--primary);
    line-height: 1.2;
  }

  .label {
    font-size: 7px;
    color: var(--text-dim);
    display: block;
    margin-bottom: 4px;
  }

  .value {
    font-size: 10px;
    color: var(--text);
  }

  .release-date .value {
    color: var(--secondary);
  }

  .platform-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .platform-tag {
    font-size: 8px;
    padding: 4px 8px;
    background: var(--bg);
    border: 1px solid var(--secondary);
    color: var(--secondary);
  }

  .availability-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--secondary);
  }

  .availability-entries {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .availability-entry {
    padding: 0.75rem;
    background: var(--bg);
    border-left: 3px solid var(--secondary);
  }

  .availability-entry.available {
    border-left-color: lime;
  }

  .availability-entry.coming {
    border-left-color: var(--secondary);
  }

  .availability-entry.leaving {
    border-left-color: var(--primary);
  }

  .availability-entry.user-has {
    background: rgba(0, 255, 0, 0.1);
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .service-name {
    font-size: 10px;
    font-weight: bold;
  }

  .status-badge {
    font-size: 7px;
    padding: 2px 6px;
    background: var(--bg-dark);
  }

  .status-badge.available {
    color: lime;
    border: 1px solid lime;
  }

  .status-badge.coming {
    color: var(--secondary);
    border: 1px solid var(--secondary);
  }

  .status-badge.leaving {
    color: var(--primary);
    border: 1px solid var(--primary);
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .entry-details {
    display: flex;
    gap: 1rem;
    font-size: 7px;
    color: var(--text-dim);
  }

  .you-have-it {
    margin-top: 6px;
    font-size: 8px;
    color: lime;
    text-shadow: 0 0 5px lime;
  }

  .not-available {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--bg);
    color: var(--text-dim);
    font-size: 10px;
    margin-top: 0.5rem;
  }

  .sad-face {
    font-size: 16px;
  }

  .description-section {
    margin-bottom: 2rem;
    padding-top: 1.5rem;
    border-top: 2px solid var(--secondary);
  }

  .description-section h2 {
    font-size: 10px;
    margin: 0 0 1rem 0;
    color: var(--secondary);
  }

  .description {
    font-size: 9px;
    line-height: 1.6;
    color: var(--text);
    margin: 0;
  }

  .stats-section {
    margin-bottom: 2rem;
    padding-top: 1.5rem;
    border-top: 2px solid var(--secondary);
  }

  .stats-section h2 {
    font-size: 10px;
    margin: 0 0 1rem 0;
    color: var(--secondary);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .stat-box {
    background: var(--bg);
    padding: 1rem;
    text-align: center;
    border: 1px solid var(--secondary);
  }

  .stat-value {
    display: block;
    font-size: 16px;
    color: var(--primary);
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 6px;
    color: var(--text-dim);
  }

  .game-id {
    font-size: 7px;
    color: var(--text-dim);
    padding-top: 1rem;
    border-top: 1px solid var(--secondary);
  }

  .game-id .value {
    font-family: monospace;
  }

  .loading {
    padding: 4rem;
    text-align: center;
    color: var(--text-dim);
    font-size: 12px;
  }

  @media (max-width: 600px) {
    .game-hero {
      grid-template-columns: 1fr;
    }

    .cover-large {
      max-width: 200px;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
