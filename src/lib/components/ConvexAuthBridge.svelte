<script lang="ts">
  import type { Snippet } from 'svelte'
  import { useClerkContext } from 'svelte-clerk/client'
  import { useConvexClient } from 'convex-svelte'

  const { children }: { children: Snippet } = $props()

  const clerk = useClerkContext()
  const convex = useConvexClient()

  $effect(() => {
    if (clerk.session) {
      convex.setAuth(async () => {
        const token = await clerk.session?.getToken({ template: 'convex' })
        return token ?? null
      })
    } else if (clerk.isLoaded && !clerk.session) {
      // Clear auth by providing a function that returns null
      convex.setAuth(async () => null)
    }
  })
</script>

{@render children()}
