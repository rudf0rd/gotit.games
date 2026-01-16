import { v } from "convex/values";
import { internalMutation, mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import MiniSearch from "minisearch";
import type { Doc } from "./_generated/dataModel";

// Search games by title (legacy Convex full-text search)
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

// Fuzzy search games using MiniSearch (better relevance)
export const fuzzySearch = action({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Doc<"games">[]> => {
    const query = args.query.trim();
    const limit = args.limit ?? 20;

    if (!query || query.length < 2) {
      return [];
    }

    // Fetch all games from the database
    const allGames: Doc<"games">[] = await ctx.runQuery(api.games.listAll, {});

    if (!allGames || allGames.length === 0) {
      return [];
    }

    // Build MiniSearch index
    const miniSearch = new MiniSearch({
      fields: ["title"], // Fields to index for search
      storeFields: ["_id"], // We only need ID to look up full game
      searchOptions: {
        boost: { title: 2 },
        fuzzy: 0.2, // Fuzzy matching threshold
        prefix: true, // Enable prefix search
      },
    });

    // Add documents with their Convex ID
    miniSearch.addAll(
      allGames.map((game) => ({
        id: game._id,
        title: game.title,
        _id: game._id,
      }))
    );

    // Search
    const results = miniSearch.search(query, {
      fuzzy: 0.2,
      prefix: true,
      combineWith: "AND", // All terms must match (helps with "God of War")
    });

    // Return top results as full game documents
    return results.slice(0, limit).map((result) => {
      const game = allGames.find((g) => g._id === result.id);
      return game!;
    }).filter(Boolean);
  },
});

// List all games (for MiniSearch indexing)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("games").collect();
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

// Internal mutation for use by RAWG actions
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

// Get a game by IGDB ID
export const getByIgdbId = query({
  args: { igdb_id: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_igdb_id", (q) => q.eq("igdb_id", args.igdb_id))
      .first();
  },
});

// Internal mutation for use by IGDB actions
export const upsertFromIgdbInternal = internalMutation({
  args: {
    igdb_id: v.number(),
    igdb_slug: v.string(),
    title: v.string(),
    cover_url: v.optional(v.string()),
    release_date: v.optional(v.string()),
    platforms: v.array(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_igdb_id", (q) => q.eq("igdb_id", args.igdb_id))
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
