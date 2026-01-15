<script lang="ts">
  import ConvexClerkProvider from './lib/components/ConvexClerkProvider.svelte'
  import ConvexAuthBridge from './lib/components/ConvexAuthBridge.svelte'
  import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk/client'
</script>

<ConvexClerkProvider>
  <ConvexAuthBridge>
    <header>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>

    <main>
      <h1>gotit.games</h1>
      <p>Track your game subscriptions. Never buy a game you already have.</p>

      <SignedIn>
        <p>You're signed in! Ready to track your games.</p>
      </SignedIn>

      <SignedOut>
        <p>Sign in to get started.</p>
      </SignedOut>
    </main>
  </ConvexAuthBridge>
</ConvexClerkProvider>

<style>
  header {
    display: flex;
    justify-content: flex-end;
    padding: 1rem;
  }

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
