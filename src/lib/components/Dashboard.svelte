<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import { useClerkContext } from 'svelte-clerk/client'
  import Search from './Search.svelte'
  import SubscriptionPicker from './SubscriptionPicker.svelte'
  import LeavingSoon from './LeavingSoon.svelte'
  import ComingSoon from './ComingSoon.svelte'

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
</script>

<div class="dashboard">
  <div class="dashboard-header">
    <div class="welcome">
      <h1>PLAYER 1</h1>
      <p class="subtitle">
        {#if subCount > 0}
          {totalGames} GAMES AVAILABLE
        {:else}
          SELECT YOUR SUBSCRIPTIONS
        {/if}
      </p>
    </div>
  </div>

  <div class="dashboard-grid">
    <aside class="sidebar">
      <SubscriptionPicker />
    </aside>

    <main class="main-content">
      <section class="search-section">
        <Search />
      </section>

      {#if subCount > 0}
        <div class="feeds">
          <section class="feed-section">
            <h2 class="section-title glow-pink">LEAVING SOON</h2>
            <LeavingSoon />
          </section>

          <section class="feed-section">
            <h2 class="section-title glow-cyan">COMING SOON</h2>
            <ComingSoon />
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

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 1rem;
    gap: 1rem;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--secondary);
  }

  .welcome h1 {
    font-size: 14px;
    margin: 0;
    color: var(--primary);
  }

  .subtitle {
    font-size: 8px;
    color: var(--secondary);
    margin: 0.5rem 0 0 0;
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

  .section-title {
    font-size: 10px;
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--secondary);
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
