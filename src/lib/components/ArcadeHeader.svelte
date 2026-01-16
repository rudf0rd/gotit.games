<script lang="ts">
  import { useQuery } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import { useClerkContext, SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk/client'
  import logoImg from '../../assets/logo.png'

  const clerk = useClerkContext()
  const stats = useQuery(api.stats.getSiteStats, () => ({}))

  // Get user's game count when logged in
  const gameCount = useQuery(
    api.catalog.countAvailableGames,
    () => clerk.user?.id ? { user_id: clerk.user.id } : 'skip'
  )

  let playerName = $derived(clerk.user?.firstName || clerk.user?.username || 'PLAYER 1')
  let availableGames = $derived(gameCount.data ?? 0)
</script>

<header class="arcade-header">
  <!-- Left: Logo breaking out -->
  <div class="logo-zone">
    <img src={logoImg} alt="Got It Games" class="logo" />
  </div>

  <!-- Center: Scrolling stats marquee -->
  <div class="marquee-zone">
    <div class="marquee-track">
      <span class="stat">HIGH SCORE: <em>$∞ SAVED</em></span>
      <span class="separator">///</span>
      <span class="stat">GAMES TRACKED: <em>{stats.data?.gamesTracked ?? '---'}</em></span>
      <span class="separator">///</span>
      <span class="stat">PLAYERS ONLINE: <em>{stats.data?.players ?? '---'}</em></span>
      <span class="separator">///</span>
      <!-- Duplicate for seamless loop -->
      <span class="stat">HIGH SCORE: <em>$∞ SAVED</em></span>
      <span class="separator">///</span>
      <span class="stat">GAMES TRACKED: <em>{stats.data?.gamesTracked ?? '---'}</em></span>
      <span class="separator">///</span>
      <span class="stat">PLAYERS ONLINE: <em>{stats.data?.players ?? '---'}</em></span>
      <span class="separator">///</span>
    </div>
  </div>

  <!-- Right: Player zone -->
  <div class="player-zone">
    <SignedOut>
      <SignInButton mode="modal">
        <button class="coin-btn">
          <span class="coin-icon">🪙</span>
          <span class="coin-text">INSERT COIN</span>
        </button>
      </SignInButton>
    </SignedOut>

    <SignedIn>
      <div class="player-info">
        <div class="player-stats">
          <span class="player-name">{playerName}</span>
          <span class="player-games">{availableGames} GAMES</span>
        </div>
        <UserButton />
      </div>
    </SignedIn>
  </div>
</header>

<style>
  .arcade-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 1.5rem;
    background: linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(10, 10, 18, 0.98) 100%);
    border-bottom: 3px solid var(--secondary);
    box-shadow:
      0 2px 0 var(--primary),
      0 4px 20px rgba(5, 217, 232, 0.2);
    position: relative;
    overflow: visible;
    min-height: 50px;
  }

  /* Scanline overlay on header */
  .arcade-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.15) 2px,
      rgba(0, 0, 0, 0.15) 4px
    );
    pointer-events: none;
  }

  .logo-zone {
    flex-shrink: 0;
    z-index: 10;
  }

  .logo {
    height: 65px;
    width: auto;
    transform: rotate(-6deg);
    margin: -12px 0 -18px -8px;
    filter: drop-shadow(0 0 6px rgba(5, 217, 232, 0.5)) drop-shadow(0 0 15px rgba(255, 42, 109, 0.3));
    transition: all 0.3s ease;
  }

  .logo:hover {
    transform: rotate(-3deg) scale(1.08);
    filter: drop-shadow(0 0 10px rgba(5, 217, 232, 0.7)) drop-shadow(0 0 25px rgba(255, 42, 109, 0.5));
  }

  .marquee-zone {
    flex: 1;
    overflow: hidden;
    margin: 0 1.5rem;
    mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
    -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
  }

  .marquee-track {
    display: flex;
    gap: 1.5rem;
    animation: marquee 20s linear infinite;
    white-space: nowrap;
  }

  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .stat {
    font-size: 7px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat em {
    font-style: normal;
    color: var(--secondary);
    text-shadow: 0 0 8px var(--secondary);
  }

  .separator {
    color: var(--primary);
    opacity: 0.5;
    font-size: 7px;
  }

  .player-zone {
    flex-shrink: 0;
    z-index: 10;
  }

  .coin-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 8px 16px;
    background: transparent;
    border: 2px solid var(--accent);
    color: var(--accent);
    font-size: 9px;
    animation: coin-pulse 1.5s ease-in-out infinite;
  }

  .coin-btn:hover {
    background: rgba(240, 230, 140, 0.15);
    box-shadow: 0 0 15px rgba(240, 230, 140, 0.4);
  }

  @keyframes coin-pulse {
    0%, 100% {
      box-shadow: 0 0 5px rgba(240, 230, 140, 0.3);
    }
    50% {
      box-shadow: 0 0 15px rgba(240, 230, 140, 0.6);
    }
  }

  .coin-icon {
    font-size: 14px;
    animation: coin-spin 3s ease-in-out infinite;
  }

  @keyframes coin-spin {
    0%, 100% { transform: rotateY(0deg); }
    50% { transform: rotateY(180deg); }
  }

  .coin-text {
    font-family: 'Press Start 2P', monospace;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .player-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .player-name {
    font-size: 8px;
    color: var(--primary);
    text-shadow: 0 0 8px var(--primary);
    text-transform: uppercase;
  }

  .player-games {
    font-size: 6px;
    color: var(--secondary);
  }

  /* Mobile */
  @media (max-width: 700px) {
    .marquee-zone {
      display: none;
    }

    .arcade-header {
      padding: 0.25rem 1rem;
    }

    .logo {
      height: 50px;
    }
  }
</style>
