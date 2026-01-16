<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'

  const stats = useQuery(api.stats.getSiteStats, () => ({}))
</script>

<footer>
  <div class="stats">
    <span>HIGH SCORE: $∞ SAVED</span>
    <span>•</span>
    <span>PLAYERS: {stats.data?.players ?? '...'}</span>
    <span>•</span>
    <span>GAMES SEARCHED: {stats.data?.gamesTracked ?? '...'}</span>
  </div>
  <p class="copyright">© 2025 got it.games • MADE WITH ♥ AND TOO MANY SUBSCRIPTIONS</p>
</footer>

<style>
  footer {
    padding: 1rem 2rem;
    border-top: 2px solid var(--secondary);
    text-align: center;
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 1rem;
    font-size: 8px;
    color: var(--text-dim);
    margin-bottom: 0.5rem;
  }

  .copyright {
    font-size: 6px;
    color: var(--text-dim);
    margin: 0;
  }

  @media (max-width: 600px) {
    .stats {
      flex-direction: column;
      gap: 0.3rem;
    }

    .stats span:nth-child(2),
    .stats span:nth-child(4) {
      display: none;
    }
  }
</style>
