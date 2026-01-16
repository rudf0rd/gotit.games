<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import { useClerkContext } from 'svelte-clerk/client'
  import type { Id } from '../../../convex/_generated/dataModel'

  interface Props {
    onGameClick?: (gameId: Id<"games">) => void
  }

  let { onGameClick }: Props = $props()

  const clerk = useClerkContext()

  // In dev mode without auth, show all leaving soon games
  // With auth, filter by user's subscriptions
  const leavingSoon = useQuery(
    api.catalog.getLeavingSoon,
    () => {
      const userId = clerk.user?.id
      return { user_id: userId, limit: 5 }
    }
  )

  function formatDaysLeft(timestamp: number | undefined): string {
    if (!timestamp) return '???'
    const now = Date.now()
    const diff = timestamp - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days <= 0) return 'TODAY'
    if (days === 1) return '1 DAY'
    if (days <= 7) return `${days} DAYS`
    if (days <= 14) return '~2 WEEKS'
    return `${Math.ceil(days / 7)} WEEKS`
  }

  function getUrgencyClass(timestamp: number | undefined): string {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = timestamp - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days <= 3) return 'urgent'
    if (days <= 7) return 'warning'
    return ''
  }
</script>

<div class="leaving-list">
  {#if leavingSoon.data && leavingSoon.data.length > 0}
    {#each leavingSoon.data as entry (entry._id)}
      <button
        class="leaving-item {getUrgencyClass(entry.leaving_date)}"
        onclick={() => entry.game_id && onGameClick?.(entry.game_id)}
      >
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
            <span class="time-left">{formatDaysLeft(entry.leaving_date)}</span>
            <span class="service" style="color: {entry.subscription?.color ?? 'inherit'}">
              {entry.subscription?.name ?? ''}
            </span>
          </div>
          {#if entry.platforms && entry.platforms.length > 0}
            <div class="platforms">
              {#each entry.platforms as platform}
                <span class="platform-tag">{platform.toUpperCase()}</span>
              {/each}
            </div>
          {/if}
          <div class="health-bar">
            <div
              class="health-fill"
              style="width: {Math.max(0, Math.min(100, ((entry.leaving_date ?? 0) - Date.now()) / (30 * 24 * 60 * 60 * 1000) * 100))}%"
            ></div>
          </div>
        </div>
      </button>
    {/each}
  {:else if leavingSoon.data?.length === 0}
    <div class="empty">
      <p>NO GAMES LEAVING</p>
      <p class="hint">ALL GOOD!</p>
    </div>
  {:else}
    <div class="loading">LOADING...</div>
  {/if}
</div>

<style>
  .leaving-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .leaving-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.5rem;
    background: rgba(255, 56, 100, 0.1);
    border: none;
    border-left: 3px solid var(--primary);
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }

  .leaving-item:hover {
    transform: translateX(4px);
    box-shadow: -4px 0 0 var(--primary);
  }

  .leaving-item.urgent {
    background: rgba(255, 56, 100, 0.25);
    animation: pulse 1s infinite;
  }

  .leaving-item.warning {
    background: rgba(255, 165, 0, 0.15);
    border-color: orange;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
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
  }

  .time-left {
    color: var(--primary);
  }

  .service {
    opacity: 0.8;
  }

  .platforms {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }

  .platform-tag {
    font-size: 5px;
    padding: 1px 3px;
    background: var(--bg);
    border: 1px solid var(--text-dim);
    color: var(--text-dim);
  }

  .health-bar {
    height: 4px;
    background: var(--bg);
    overflow: hidden;
    margin-top: auto;
  }

  .health-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary) 0%, orange 50%, lime 100%);
    transition: width 0.3s ease;
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
