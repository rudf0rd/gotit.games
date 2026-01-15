<script lang="ts">
  import type { Snippet } from 'svelte'
  import { ClerkProvider } from 'svelte-clerk/client'
  import { setupConvex } from 'convex-svelte'

  const { children }: { children: Snippet } = $props()

  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string

  setupConvex(convexUrl)
</script>

<ClerkProvider {publishableKey}>
  {@render children()}
</ClerkProvider>
