import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Search games by title (fuzzy search)
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return [];
    }

    const results = await ctx.db
      .query("games")
      .withSearchIndex("search_title", (q) => q.search("title", args.query))
      .take(20);

    return results;
  },
});

// Get a game by ID
export const get = query({
  args: { id: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get a game by RAWG slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_rawg_slug", (q) => q.eq("rawg_slug", args.slug))
      .first();
  },
});

// Get a game by RAWG ID
export const getByRawgId = query({
  args: { rawg_id: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_rawg_id", (q) => q.eq("rawg_id", args.rawg_id))
      .first();
  },
});

// Create or update a game from RAWG data
export const upsertFromRawg = mutation({
  args: {
    rawg_id: v.number(),
    rawg_slug: v.string(),
    title: v.string(),
    cover_url: v.optional(v.string()),
    release_date: v.optional(v.string()),
    platforms: v.array(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_rawg_id", (q) => q.eq("rawg_id", args.rawg_id))
      .first();

    const data = {
      ...args,
      updated_at: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("games", data);
  },
});

// Get recently added games (for dashboard)
export const getRecentlyAdded = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get catalog entries that are available, sorted by when they were verified
    const entries = await ctx.db
      .query("catalog_entries")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .order("desc")
      .take(limit * 2); // Get extra in case of duplicates

    // Get unique games
    const seenGames = new Set<string>();
    const results = [];

    for (const entry of entries) {
      if (seenGames.has(entry.game_id)) continue;
      seenGames.add(entry.game_id);

      const game = await ctx.db.get(entry.game_id);
      if (game) {
        results.push(game);
        if (results.length >= limit) break;
      }
    }

    return results;
  },
});

// Internal mutation for use by actions
export const upsertFromRawgInternal = internalMutation({
  args: {
    rawg_id: v.number(),
    rawg_slug: v.string(),
    title: v.string(),
    cover_url: v.optional(v.string()),
    release_date: v.optional(v.string()),
    platforms: v.array(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_rawg_id", (q) => q.eq("rawg_id", args.rawg_id))
      .first();

    const data = {
      ...args,
      updated_at: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("games", data);
  },
});
