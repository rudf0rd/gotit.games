<script lang="ts">
  import { useQuery, useConvexClient } from 'convex-svelte'
  import { api } from '../../../convex/_generated/api'
  import { useClerkContext } from 'svelte-clerk/client'
  import type { Id } from '../../../convex/_generated/dataModel'

  const clerk = useClerkContext()
  const convex = useConvexClient()

  // Get all available subscriptions
  const allSubs = useQuery(api.subscriptions.list, () => ({}))

  // Get user's current subscriptions
  const userSubs = useQuery(
    api.subscriptions.getUserSubscriptions,
    () => clerk.user?.id ? { user_id: clerk.user.id } : 'skip'
  )

  // Track which subs the user has
  let userSubMap = $derived(new Map(
    (userSubs.data ?? []).map(us => [us.subscription_id, us.tier_slug])
  ))

  async function toggleSubscription(subId: Id<"subscriptions">, tierSlug: string) {
    if (!clerk.user?.id) return

    const hasIt = userSubMap.has(subId)

    if (hasIt) {
      await convex.mutation(api.subscriptions.removeUserSubscription, {
        user_id: clerk.user.id,
        subscription_id: subId
      })
    } else {
      await convex.mutation(api.subscriptions.addUserSubscription, {
        user_id: clerk.user.id,
        subscription_id: subId,
        tier_slug: tierSlug
      })
    }
  }

  async function updateTier(subId: Id<"subscriptions">, tierSlug: string) {
    if (!clerk.user?.id) return

    await convex.mutation(api.subscriptions.addUserSubscription, {
      user_id: clerk.user.id,
      subscription_id: subId,
      tier_slug: tierSlug
    })
  }
</script>

<div class="picker">
  <h2 class="picker-title">YOUR SERVICES</h2>

  {#if allSubs.data}
    <div class="sub-list">
      {#each allSubs.data as sub (sub._id)}
        {@const isActive = userSubMap.has(sub._id)}
        {@const currentTier = userSubMap.get(sub._id)}

        <div class="sub-item" class:active={isActive}>
          <button
            class="sub-toggle"
            onclick={() => toggleSubscription(sub._id, sub.tiers[0]?.slug ?? 'standard')}
            style="--sub-color: {sub.color}"
          >
            <span class="checkbox">{isActive ? '☑' : '☐'}</span>
            <span class="sub-name">{sub.name}</span>
          </button>

          {#if isActive && sub.tiers.length > 1}
            <div class="tier-select">
              {#each sub.tiers as tier (tier.slug)}
                <button
                  class="tier-btn"
                  class:selected={currentTier === tier.slug}
                  onclick={() => updateTier(sub._id, tier.slug)}
                >
                  {tier.name}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="loading">LOADING...</p>
  {/if}
</div>

<style>
  .picker {
    padding: 0.5rem 0;
  }

  .picker-title {
    font-size: 8px;
    color: var(--text-dim);
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--secondary);
  }

  .sub-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .sub-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sub-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 8px;
    cursor: pointer;
    text-align: left;
    padding: 0.25rem;
    transition: color 0.2s;
  }

  .sub-toggle:hover {
    color: var(--text);
  }

  .sub-item.active .sub-toggle {
    color: var(--sub-color, var(--secondary));
  }

  .checkbox {
    font-size: 10px;
  }

  .sub-name {
    flex: 1;
  }

  .tier-select {
    display: flex;
    gap: 4px;
    padding-left: 1.25rem;
  }

  .tier-btn {
    font-size: 6px;
    padding: 2px 6px;
    background: var(--bg-dark);
    border: 1px solid var(--secondary);
    color: var(--text-dim);
    cursor: pointer;
  }

  .tier-btn:hover {
    border-color: var(--text);
    color: var(--text);
  }

  .tier-btn.selected {
    background: var(--secondary);
    border-color: var(--secondary);
    color: var(--bg-dark);
  }

  .loading {
    font-size: 8px;
    color: var(--text-dim);
    text-align: center;
  }
</style>
