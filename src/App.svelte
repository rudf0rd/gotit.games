<script lang="ts">
  import ConvexClerkProvider from './lib/components/ConvexClerkProvider.svelte'
  import ConvexAuthBridge from './lib/components/ConvexAuthBridge.svelte'
  import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk/client'

  // Animated ASCII frames for the controller
  const frames = [
    `
  ┌───────────────────────────┐
  │   ╔═══╗         ╔═══╗    │
  │   ║ ▲ ║    ◉    ║ X ║    │
  │ ╔═╬═══╬═╗     ╔═╬═══╬═╗  │
  │ ║ ◄   ► ║     ║ ◯   □ ║  │
  │ ╚═╬═══╬═╝     ╚═╬═══╬═╝  │
  │   ║ ▼ ║   ☐ ☐   ║ △ ║    │
  │   ╚═══╝         ╚═══╝    │
  └───────────────────────────┘`,
    `
  ┌───────────────────────────┐
  │   ╔═══╗         ╔═══╗    │
  │   ║ ▲ ║    ●    ║ X ║    │
  │ ╔═╬═══╬═╗     ╔═╬═══╬═╗  │
  │ ║ ◄   ► ║     ║ ◯   □ ║  │
  │ ╚═╬═══╬═╝     ╚═╬═══╬═╝  │
  │   ║ ▼ ║   ☐ ☐   ║ △ ║    │
  │   ╚═══╝         ╚═══╝    │
  └───────────────────────────┘`
  ]

  let frameIndex = $state(0)

  $effect(() => {
    const interval = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length
    }, 500)
    return () => clearInterval(interval)
  })

  // Typing effect for tagline
  const fullText = "NEVER BUY A GAME YOU ALREADY OWN"
  let displayText = $state("")
  let charIndex = $state(0)

  $effect(() => {
    if (charIndex < fullText.length) {
      const timeout = setTimeout(() => {
        displayText = fullText.slice(0, charIndex + 1)
        charIndex++
      }, 100)
      return () => clearTimeout(timeout)
    }
  })
</script>

<ConvexClerkProvider>
  <ConvexAuthBridge>
    <div class="container">
      <header>
        <div class="logo-small">GOTIT.GAMES</div>
        <nav>
          <SignedOut>
            <SignInButton>
              <button>INSERT COIN</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </nav>
      </header>

      <main>
        <div class="hero">
          <pre class="ascii-art glow-cyan">{frames[frameIndex]}</pre>

          <h1 class="title">
            <span class="glow-pink">GOTIT</span><span class="glow-cyan">.GAMES</span>
          </h1>

          <p class="tagline">
            {displayText}<span class="blink">_</span>
          </p>

          <div class="description pixel-border">
            <p>▶ TRACK YOUR SUBSCRIPTIONS</p>
            <p class="indent">├─ GAME PASS</p>
            <p class="indent">├─ PS+ EXTRA</p>
            <p class="indent">├─ EA PLAY</p>
            <p class="indent">└─ AND MORE...</p>
            <br>
            <p>▶ SEARCH BEFORE YOU BUY</p>
            <p>▶ LINK YOUR ACCOUNTS</p>
            <p>▶ <span class="rainbow">SAVE YOUR GOLD</span></p>
          </div>

          <SignedOut>
            <div class="cta">
              <SignInButton>
                <button class="big-button">
                  ▶ START GAME ◀
                </button>
              </SignInButton>
              <p class="hint">FREE TO PLAY • NO ADS • NO BS</p>
            </div>
          </SignedOut>

          <SignedIn>
            <div class="cta">
              <p class="status glow-cyan">► PLAYER 1 READY ◄</p>
              <p class="hint">LOADING GAME LIBRARY...</p>
            </div>
          </SignedIn>
        </div>

        <footer>
          <div class="stats">
            <span>HIGH SCORE: $∞ SAVED</span>
            <span>•</span>
            <span>PLAYERS: LOADING...</span>
            <span>•</span>
            <span>GAMES TRACKED: ████</span>
          </div>
          <p class="copyright">© 2025 GOTIT.GAMES • MADE WITH ♥ AND TOO MANY SUBSCRIPTIONS</p>
        </footer>
      </main>
    </div>
  </ConvexAuthBridge>
</ConvexClerkProvider>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    border-bottom: 2px solid var(--secondary);
  }

  .logo-small {
    font-size: 10px;
    color: var(--primary);
    text-shadow: 2px 2px 0 var(--purple);
  }

  nav {
    display: flex;
    gap: 1rem;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1.5rem;
  }

  .ascii-art {
    font-size: 6px;
    line-height: 1.1;
    letter-spacing: 2px;
  }

  .title {
    font-size: 2rem;
    margin: 0;
    letter-spacing: 4px;
  }

  .tagline {
    font-size: 10px;
    color: var(--accent);
    min-height: 1.5em;
  }

  .description {
    text-align: left;
    font-size: 10px;
    max-width: 400px;
  }

  .description p {
    margin: 0.3rem 0;
  }

  .indent {
    padding-left: 1rem;
    color: var(--text-dim);
  }

  .cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .big-button {
    font-size: 14px;
    padding: 16px 32px;
    background: linear-gradient(180deg, var(--primary) 0%, #c4214f 100%);
    border: 3px solid var(--accent);
    color: white;
    animation: pulse 2s ease-in-out infinite;
  }

  .big-button:hover {
    background: linear-gradient(180deg, #ff4d8d 0%, var(--primary) 100%);
    box-shadow:
      0 0 20px var(--primary),
      0 0 40px var(--primary),
      0 0 60px var(--primary);
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  .hint {
    font-size: 8px;
    color: var(--text-dim);
  }

  .status {
    font-size: 14px;
    margin: 0;
  }

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

  /* Mobile adjustments */
  @media (max-width: 600px) {
    .title {
      font-size: 1.2rem;
    }

    .ascii-art {
      font-size: 4px;
    }

    .stats {
      flex-direction: column;
      gap: 0.3rem;
    }

    .stats span:nth-child(2) {
      display: none;
    }
  }
</style>
