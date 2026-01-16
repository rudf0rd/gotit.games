<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import { useClerkContext } from 'svelte-clerk/client'
  import Search from './Search.svelte'
  import SubscriptionPicker from './SubscriptionPicker.svelte'
  import LeavingSoon from './LeavingSoon.svelte'
  import ComingSoon from './ComingSoon.svelte'
  import Timeline from './Timeline.svelte'
  import GameDetail from './GameDetail.svelte'
  import type { Id } from '../../../convex/_generated/dataModel'

  // Dev mode bypass - show feeds without auth
  const DEV_BYPASS = import.meta.env.DEV && true

  const clerk = useClerkContext()

  // Get user's subscriptions
  const userSubs = useQuery(
    api.subscriptions.getUserSubscriptions,
    () => clerk.user?.id ? { user_id: clerk.user.id } : 'skip'
  )

  // Count available games for user
  const gameCount = useQuery(
    api.catalog.countAvailableGames,
    () => clerk.user?.id ? { user_id: clerk.user.id } : 'skip'
  )

  let totalGames = $derived(gameCount.data ?? 0)
  let subCount = $derived(userSubs.data?.length ?? 0)
  // In dev mode, always show feeds (bypass subscription check)
  let showFeeds = $derived(DEV_BYPASS || subCount > 0)

  // Timeline modal state
  let timelineMode: 'leaving' | 'coming' | null = $state(null)

  // Game detail modal state
  let selectedGameId: Id<"games"> | null = $state(null)

  function handleGameClick(gameId: Id<"games">) {
    selectedGameId = gameId
  }
</script>

<div class="dashboard">
  <div class="dashboard-grid">
    <aside class="sidebar">
      <SubscriptionPicker />
    </aside>

    <main class="main-content">
      <section class="search-section">
        <Search onGameClick={handleGameClick} />
      </section>

      {#if showFeeds}
        <div class="feeds">
          <section class="feed-section">
            <div class="section-header">
              <h2 class="section-title glow-pink">LEAVING SOON</h2>
              <button class="view-all-btn" onclick={() => timelineMode = 'leaving'}>
                VIEW ALL
              </button>
            </div>
            <LeavingSoon onGameClick={handleGameClick} />
          </section>

          <section class="feed-section">
            <div class="section-header">
              <h2 class="section-title glow-cyan">COMING SOON</h2>
              <button class="view-all-btn" onclick={() => timelineMode = 'coming'}>
                VIEW ALL
              </button>
            </div>
            <ComingSoon onGameClick={handleGameClick} />
          </section>
        </div>
      {:else}
        <div class="onboarding">
          <div class="pixel-border">
            <h2>GET STARTED</h2>
            <p>Select your subscriptions from the sidebar to see:</p>
            <ul>
              <li>Games leaving soon</li>
              <li>New games coming</li>
              <li>Your full game library</li>
            </ul>
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>

{#if timelineMode}
  <Timeline mode={timelineMode} onClose={() => timelineMode = null} onGameClick={handleGameClick} />
{/if}

{#if selectedGameId}
  <GameDetail gameId={selectedGameId} onClose={() => selectedGameId = null} />
{/if}

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 1rem;
    gap: 1rem;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 2rem;
    flex: 1;
  }

  .sidebar {
    border-right: 2px solid var(--secondary);
    padding-right: 1rem;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .search-section {
    width: 100%;
  }

  .feeds {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .feed-section {
    background: var(--bg-dark);
    border: 2px solid var(--secondary);
    padding: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--secondary);
  }

  .section-title {
    font-size: 10px;
    margin: 0;
  }

  .view-all-btn {
    font-size: 7px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid var(--text-dim);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .view-all-btn:hover {
    border-color: var(--secondary);
    color: var(--secondary);
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
  }

  .onboarding {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }

  .onboarding .pixel-border {
    max-width: 400px;
    text-align: center;
    padding: 2rem;
  }

  .onboarding h2 {
    font-size: 12px;
    margin: 0 0 1rem 0;
    color: var(--primary);
  }

  .onboarding p {
    font-size: 8px;
    color: var(--text);
    margin: 0 0 1rem 0;
  }

  .onboarding ul {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
  }

  .onboarding li {
    font-size: 8px;
    color: var(--text-dim);
    padding: 0.25rem 0;
  }

  .onboarding li::before {
    content: "▶ ";
    color: var(--secondary);
  }

  @media (max-width: 800px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }

    .sidebar {
      border-right: none;
      border-bottom: 2px solid var(--secondary);
      padding-right: 0;
      padding-bottom: 1rem;
    }

    .feeds {
      grid-template-columns: 1fr;
    }
  }
</style>
