<script lang="ts">
  import { setupConvex } from 'convex-svelte'

  const convexUrl = import.meta.env.VITE_CONVEX_URL as string
  setupConvex(convexUrl)
</script>

<main>
  <h1>gotit.games</h1>
  <p>Track your game subscriptions. Never buy a game you already have.</p>
</main>

<style>
  main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }

  h1 {
    font-size: 3.2em;
    line-height: 1.1;
  }
</style>
