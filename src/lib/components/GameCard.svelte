<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import type { Doc } from '../../../convex/_generated/dataModel'
  import { useClerkContext } from 'svelte-clerk/client'

  interface Props {
    game: Doc<"games">
    onClick?: (gameId: Doc<"games">["_id"]) => void
  }

  let { game, onClick }: Props = $props()
  const clerk = useClerkContext()

  // Check availability for this game
  const availability = useQuery(
    api.catalog.checkAvailability,
    () => ({
      game_id: game._id,
      user_id: clerk.user?.id
    })
  )

  let isAvailable = $derived(availability.data?.available ?? false)
  let inUserSubs = $derived(availability.data?.inUserSubs ?? false)
</script>

<button class="game-card" class:available={inUserSubs} class:not-available={!inUserSubs && isAvailable} onclick={() => onClick?.(game._id)}>
  <div class="cover">
    {#if game.cover_url}
      <img src={game.cover_url} alt={game.title} loading="lazy" />
    {:else}
      <div class="no-cover">
        <span>NO IMAGE</span>
      </div>
    {/if}

    {#if inUserSubs}
      <div class="badge got-it">GOT IT!</div>
    {:else if isAvailable}
      <div class="badge available">AVAILABLE</div>
    {/if}
  </div>

  <div class="info">
    <h3 class="title">{game.title}</h3>
    {#if game.release_date}
      <p class="release">{game.release_date}</p>
    {/if}

    {#if availability.data?.entries && availability.data.entries.length > 0}
      <div class="services">
        {#each availability.data.entries as entry}
          {#if entry.subscription}
            <span
              class="service-tag"
              style="--service-color: {entry.subscription.color}"
              class:user-has={entry.userHasAccess}
            >
              {entry.subscription.name}
            </span>
          {/if}
        {/each}
      </div>
    {:else}
      <p class="not-tracked">NOT IN ANY SERVICE</p>
    {/if}
  </div>
</button>

<style>
  .game-card {
    background: var(--bg-dark);
    border: 2px solid var(--secondary);
    overflow: hidden;
    transition: all 0.2s ease;
    cursor: pointer;
    padding: 0;
    text-align: left;
    width: 100%;
  }

  .game-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 56, 100, 0.3);
  }

  .game-card.available {
    border-color: var(--secondary);
  }

  .game-card.available:hover {
    border-color: var(--secondary);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }

  .cover {
    position: relative;
    aspect-ratio: 3/4;
    background: var(--bg);
    overflow: hidden;
  }

  .cover img {
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
    font-size: 8px;
  }

  .badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 8px;
    font-size: 6px;
    font-weight: bold;
  }

  .badge.got-it {
    background: var(--secondary);
    color: var(--bg-dark);
  }

  .badge.available {
    background: var(--accent);
    color: var(--bg-dark);
  }

  .info {
    padding: 0.75rem;
  }

  .title {
    font-size: 8px;
    margin: 0 0 0.5rem 0;
    color: var(--text);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .release {
    font-size: 6px;
    color: var(--text-dim);
    margin: 0 0 0.5rem 0;
  }

  .services {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .service-tag {
    font-size: 5px;
    padding: 2px 4px;
    background: var(--service-color, var(--secondary));
    color: white;
    opacity: 0.5;
  }

  .service-tag.user-has {
    opacity: 1;
    box-shadow: 0 0 4px var(--service-color, var(--secondary));
  }

  .not-tracked {
    font-size: 6px;
    color: var(--text-dim);
    margin: 0;
  }
</style>
