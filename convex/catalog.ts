import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Check if a game is available for a user based on their subscriptions
export const checkAvailability = query({
  args: {
    game_id: v.id("games"),
    user_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all catalog entries for this game
    const entries = await ctx.db
      .query("catalog_entries")
      .withIndex("by_game", (q) => q.eq("game_id", args.game_id))
      .collect();

    if (entries.length === 0) {
      return {
        available: false,
        inUserSubs: false,
        entries: [],
      };
    }

    // Get user's subscriptions if user_id provided
    let userSubs: Doc<"user_subscriptions">[] = [];
    if (args.user_id) {
      const userId = args.user_id;
      userSubs = await ctx.db
        .query("user_subscriptions")
        .withIndex("by_user", (q) => q.eq("user_id", userId))
        .collect();
    }

    // Enrich entries with subscription details
    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const subscription = await ctx.db.get(entry.subscription_id);
        const tier = subscription?.tiers.find((t) => t.slug === entry.tier_slug);

        // Check if user has this subscription with sufficient tier
        let userHasAccess = false;
        if (subscription && args.user_id) {
          const userSub = userSubs.find(
            (us) => us.subscription_id === entry.subscription_id
          );
          if (userSub) {
            const userTier = subscription.tiers.find(
              (t) => t.slug === userSub.tier_slug
            );
            const requiredTier = subscription.tiers.find(
              (t) => t.slug === entry.tier_slug
            );
            userHasAccess =
              userTier && requiredTier
                ? userTier.rank >= requiredTier.rank
                : false;
          }
        }

        return {
          ...entry,
          subscription,
          tier,
          userHasAccess,
        };
      })
    );

    const inUserSubs = enrichedEntries.some((e) => e.userHasAccess);
    const hasAvailable = enrichedEntries.some((e) => e.status === "available");

    return {
      available: hasAvailable,
      inUserSubs,
      entries: enrichedEntries,
    };
  },
});

// Get games leaving soon
export const getLeavingSoon = query({
  args: {
    user_id: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get user subs for filtering
    let userSubIds: Id<"subscriptions">[] = [];
    if (args.user_id) {
      const userId = args.user_id;
      const userSubs = await ctx.db
        .query("user_subscriptions")
        .withIndex("by_user", (q) => q.eq("user_id", userId))
        .collect();
      userSubIds = userSubs.map((us) => us.subscription_id);
    }

    // Get leaving soon entries
    let entries = await ctx.db
      .query("catalog_entries")
      .withIndex("by_status", (q) => q.eq("status", "leaving_soon"))
      .collect();

    // Filter by user subs if provided
    if (args.user_id && userSubIds.length > 0) {
      entries = entries.filter((e) => userSubIds.includes(e.subscription_id));
    }

    // Sort by leaving date (soonest first)
    entries.sort((a, b) => (a.leaving_date ?? 0) - (b.leaving_date ?? 0));
    entries = entries.slice(0, limit);

    // Enrich with game and subscription data
    return await Promise.all(
      entries.map(async (entry) => {
        const game = await ctx.db.get(entry.game_id);
        const subscription = await ctx.db.get(entry.subscription_id);
        return { ...entry, game, subscription };
      })
    );
  },
});

// Get games coming soon
export const getComingSoon = query({
  args: {
    user_id: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get user subs for filtering
    let userSubIds: Id<"subscriptions">[] = [];
    if (args.user_id) {
      const userId = args.user_id;
      const userSubs = await ctx.db
        .query("user_subscriptions")
        .withIndex("by_user", (q) => q.eq("user_id", userId))
        .collect();
      userSubIds = userSubs.map((us) => us.subscription_id);
    }

    // Get coming soon entries
    let entries = await ctx.db
      .query("catalog_entries")
      .withIndex("by_status", (q) => q.eq("status", "coming_soon"))
      .collect();

    // Filter by user subs if provided
    if (args.user_id && userSubIds.length > 0) {
      entries = entries.filter((e) => userSubIds.includes(e.subscription_id));
    }

    // Sort by available date (soonest first)
    entries.sort((a, b) => (a.available_date ?? 0) - (b.available_date ?? 0));
    entries = entries.slice(0, limit);

    // Enrich with game and subscription data
    return await Promise.all(
      entries.map(async (entry) => {
        const game = await ctx.db.get(entry.game_id);
        const subscription = await ctx.db.get(entry.subscription_id);
        return { ...entry, game, subscription };
      })
    );
  },
});

// Count available games for a user
export const countAvailableGames = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    // Get user's subscriptions
    const userSubs = await ctx.db
      .query("user_subscriptions")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    if (userSubs.length === 0) {
      return 0;
    }

    const userSubIds = userSubs.map((us) => us.subscription_id);

    // Get all available entries for user's subscriptions
    const entries = await ctx.db
      .query("catalog_entries")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();

    const relevantEntries = entries.filter((e) =>
      userSubIds.includes(e.subscription_id)
    );

    // Count unique games
    const uniqueGames = new Set(relevantEntries.map((e) => e.game_id));
    return uniqueGames.size;
  },
});

// Add or update a catalog entry
export const upsertEntry = mutation({
  args: {
    game_id: v.id("games"),
    subscription_id: v.id("subscriptions"),
    tier_slug: v.string(),
    platform: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("coming_soon"),
      v.literal("leaving_soon")
    ),
    available_date: v.optional(v.number()),
    leaving_date: v.optional(v.number()),
    service_game_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Look for existing entry with same game, subscription, and platform
    const entries = await ctx.db
      .query("catalog_entries")
      .withIndex("by_game", (q) => q.eq("game_id", args.game_id))
      .collect();

    const existing = entries.find(
      (e) =>
        e.subscription_id === args.subscription_id && e.platform === args.platform
    );

    const data = {
      ...args,
      last_verified_at: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("catalog_entries", data);
  },
});

// Remove a catalog entry
export const removeEntry = mutation({
  args: { id: v.id("catalog_entries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
