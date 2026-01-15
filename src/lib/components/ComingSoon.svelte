<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import { useClerkContext } from 'svelte-clerk/client'

  const clerk = useClerkContext()

  const comingSoon = useQuery(
    api.catalog.getComingSoon,
    () => clerk.user?.id ? { user_id: clerk.user.id, limit: 5 } : 'skip'
  )

  function formatArrival(timestamp: number | undefined): string {
    if (!timestamp) return 'TBD'
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function formatDaysUntil(timestamp: number | undefined): string {
    if (!timestamp) return '???'
    const now = Date.now()
    const diff = timestamp - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days <= 0) return 'NOW!'
    if (days === 1) return 'TOMORROW'
    if (days <= 7) return `${days} DAYS`
    return `${Math.ceil(days / 7)} WEEKS`
  }
</script>

<div class="coming-list">
  {#if comingSoon.data && comingSoon.data.length > 0}
    {#each comingSoon.data as entry (entry._id)}
      <div class="coming-item">
        <div class="game-cover">
          {#if entry.game?.cover_url}
            <img src={entry.game.cover_url} alt={entry.game?.title ?? 'Game'} />
          {:else}
            <div class="no-cover">?</div>
          {/if}
        </div>
        <div class="game-info">
          <h4 class="game-title">{entry.game?.title ?? 'Unknown'}</h4>
          <div class="meta">
            <span class="arrival-date">{formatArrival(entry.available_date)}</span>
            <span class="time-until">{formatDaysUntil(entry.available_date)}</span>
          </div>
          <div class="service-tag" style="background: {entry.subscription?.color ?? 'var(--secondary)'}">
            {entry.subscription?.name ?? ''}
          </div>
        </div>
      </div>
    {/each}
  {:else if comingSoon.data?.length === 0}
    <div class="empty">
      <p>NO NEW GAMES</p>
      <p class="hint">CHECK BACK SOON!</p>
    </div>
  {:else}
    <div class="loading">LOADING...</div>
  {/if}
</div>

<style>
  .coming-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .coming-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.5rem;
    background: rgba(0, 255, 255, 0.1);
    border-left: 3px solid var(--secondary);
  }

  .game-cover {
    width: 40px;
    height: 53px;
    flex-shrink: 0;
    background: var(--bg);
    overflow: hidden;
  }

  .game-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .no-cover {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 10px;
  }

  .game-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .game-title {
    font-size: 7px;
    margin: 0;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 6px;
    color: var(--text-dim);
  }

  .arrival-date {
    color: var(--secondary);
  }

  .time-until {
    color: var(--accent);
  }

  .service-tag {
    font-size: 5px;
    padding: 2px 4px;
    color: white;
    align-self: flex-start;
    margin-top: auto;
  }

  .empty {
    text-align: center;
    padding: 1rem;
    color: var(--text-dim);
  }

  .empty p {
    margin: 0.25rem 0;
  }

  .empty .hint {
    font-size: 6px;
    color: var(--secondary);
  }

  .loading {
    text-align: center;
    font-size: 8px;
    color: var(--text-dim);
    padding: 1rem;
  }
</style>
