import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const RAWG_BASE_URL = "https://api.rawg.io/api";

// Search for games on RAWG
export const searchGames = action({
  args: { query: v.string(), page: v.optional(v.number()) },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RAWG_API_KEY;
    if (!apiKey) {
      throw new Error("RAWG_API_KEY environment variable is not set");
    }

    const page = args.page ?? 1;
    const url = `${RAWG_BASE_URL}/games?key=${apiKey}&search=${encodeURIComponent(args.query)}&page=${page}&page_size=10`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      count: data.count,
      results: data.results.map((game: RawgGame) => ({
        rawg_id: game.id,
        rawg_slug: game.slug,
        title: game.name,
        cover_url: game.background_image,
        release_date: game.released,
        platforms: game.platforms?.map((p: { platform: { slug: string } }) =>
          normalizePlatform(p.platform.slug)
        ).filter(Boolean) ?? [],
        metacritic: game.metacritic,
      })),
    };
  },
});

// Get a single game's details from RAWG
export const getGameDetails = action({
  args: { rawg_id: v.number() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RAWG_API_KEY;
    if (!apiKey) {
      throw new Error("RAWG_API_KEY environment variable is not set");
    }

    const url = `${RAWG_BASE_URL}/games/${args.rawg_id}?key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status}`);
    }

    const game = await response.json();

    return {
      rawg_id: game.id,
      rawg_slug: game.slug,
      title: game.name,
      cover_url: game.background_image,
      release_date: game.released,
      platforms: game.platforms?.map((p: { platform: { slug: string } }) =>
        normalizePlatform(p.platform.slug)
      ).filter(Boolean) ?? [],
      description: game.description_raw,
    };
  },
});

// Import a game from RAWG into our database
export const importGame = action({
  args: { rawg_id: v.number() },
  returns: v.id("games"),
  handler: async (ctx, args): Promise<Id<"games">> => {
    const apiKey = process.env.RAWG_API_KEY;
    if (!apiKey) {
      throw new Error("RAWG_API_KEY environment variable is not set");
    }

    const url = `${RAWG_BASE_URL}/games/${args.rawg_id}?key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status}`);
    }

    const game = await response.json();

    // Use the mutation to upsert the game
    const gameId: Id<"games"> = await ctx.runMutation(internal.games.upsertFromRawgInternal, {
      rawg_id: game.id,
      rawg_slug: game.slug,
      title: game.name,
      cover_url: game.background_image ?? undefined,
      release_date: game.released ?? undefined,
      platforms: game.platforms?.map((p: { platform: { slug: string } }) =>
        normalizePlatform(p.platform.slug)
      ).filter(Boolean) ?? [],
      description: game.description_raw ?? undefined,
    });

    return gameId;
  },
});

// Normalize RAWG platform slugs to our simplified platform names
function normalizePlatform(slug: string): string | null {
  const mapping: Record<string, string> = {
    // PC
    "pc": "pc",
    // PlayStation
    "playstation5": "playstation",
    "playstation4": "playstation",
    "playstation3": "playstation",
    // Xbox
    "xbox-one": "xbox",
    "xbox-series-x": "xbox",
    "xbox360": "xbox",
    // Nintendo
    "nintendo-switch": "switch",
    // Cloud
    "web": "cloud",
  };

  return mapping[slug] ?? null;
}

// Type for RAWG API response
interface RawgGame {
  id: number;
  slug: string;
  name: string;
  background_image: string | null;
  released: string | null;
  platforms: Array<{ platform: { slug: string } }> | null;
  metacritic: number | null;
  description_raw?: string;
}
