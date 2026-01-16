<script lang="ts">
  import ConvexClerkProvider from './lib/components/ConvexClerkProvider.svelte'
  import ConvexAuthBridge from './lib/components/ConvexAuthBridge.svelte'
  import Pong from './lib/components/Pong.svelte'
  import Dashboard from './lib/components/Dashboard.svelte'
  import Footer from './lib/components/Footer.svelte'
  import { SignedIn, SignedOut, SignInButton, UserButton, ClerkLoading, ClerkLoaded } from 'svelte-clerk/client'

  // Dev mode bypass - show dashboard without auth for testing
  // SAFE: import.meta.env.DEV is false in production builds (Vite replaces at build time)
  // Toggle the `&& true` to `&& false` to test normal auth flow locally
  const DEV_BYPASS_AUTH = import.meta.env.DEV && true

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
        <div class="logo-small">got it<span class="logo-dot">.</span>games</div>
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
        {#if DEV_BYPASS_AUTH}
          <!-- Dev mode: show dashboard without auth -->
          <Dashboard />
        {:else}
          <!-- Show hero while Clerk is loading -->
          <ClerkLoading>
            <div class="hero">
              <Pong />

              <h1 class="title">
                <span class="glow-pink">got it</span><span class="glow-cyan">.games</span>
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

              <div class="cta">
                <p class="loading-text">LOADING...</p>
              </div>
            </div>
          </ClerkLoading>

          <ClerkLoaded>
            <SignedOut>
              <div class="hero">
                <Pong />

                <h1 class="title">
                  <span class="glow-pink">got it</span><span class="glow-cyan">.games</span>
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

                <div class="cta">
                  <SignInButton>
                    <button class="big-button">
                      ▶ START GAME ◀
                    </button>
                  </SignInButton>
                  <p class="hint">FREE TO PLAY • NO ADS • NO BS</p>
                </div>
              </div>
            </SignedOut>

            <SignedIn>
              <Dashboard />
            </SignedIn>
          </ClerkLoaded>
        {/if}

        <Footer />
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

  .logo-dot {
    color: var(--secondary);
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
    font-size: 12px;
    padding: 14px 28px;
    background: transparent;
    border: 2px solid var(--primary);
    color: var(--primary);
    animation: pulse 2s ease-in-out infinite;
  }

  .big-button:hover {
    background: rgba(255, 42, 109, 0.2);
    border-color: var(--accent);
    color: var(--accent);
    box-shadow:
      0 0 15px var(--primary),
      0 0 30px var(--primary);
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  .hint {
    font-size: 8px;
    color: var(--text-dim);
  }

  .loading-text {
    font-size: 10px;
    color: var(--secondary);
    animation: blink-anim 1s infinite;
  }

  @keyframes blink-anim {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
  }

  /* Mobile adjustments */
  @media (max-width: 600px) {
    .title {
      font-size: 1.2rem;
    }
  }
</style>
