import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL = "https://api.igdb.com/v4";

// Cache the access token (valid for ~60 days)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set");
  }

  const response = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Twitch token: ${response.status}`);
  }

  const data = await response.json();

  // Cache the token (expire 1 hour early to be safe)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 3600) * 1000,
  };

  return data.access_token;
}

async function igdbRequest(endpoint: string, body: string): Promise<unknown> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) throw new Error("TWITCH_CLIENT_ID must be set");

  const token = await getAccessToken();

  const response = await fetch(`${IGDB_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IGDB API error ${response.status}: ${text}`);
  }

  return response.json();
}

// Search for games on IGDB
export const searchGames = action({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (_ctx, args) => {
    const limit = args.limit ?? 10;

    const games = await igdbRequest(
      "/games",
      `search "${args.query}";
       fields name, slug, cover.url, first_release_date, platforms.name, summary;
       limit ${limit};`
    ) as IgdbGame[];

    return games.map((game) => ({
      igdb_id: game.id,
      igdb_slug: game.slug,
      title: game.name,
      cover_url: game.cover?.url
        ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
        : undefined,
      release_date: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
        : undefined,
      platforms: (game.platforms?.map((p) => normalizePlatform(p.name)).filter((p): p is string => p !== null) ?? []),
      description: game.summary,
    }));
  },
});

// Get a single game's details from IGDB
export const getGameDetails = action({
  args: { igdb_id: v.number() },
  handler: async (_ctx, args) => {
    const games = await igdbRequest(
      "/games",
      `where id = ${args.igdb_id};
       fields name, slug, cover.url, first_release_date, platforms.name, summary;`
    ) as IgdbGame[];

    if (games.length === 0) {
      throw new Error(`Game not found: ${args.igdb_id}`);
    }

    const game = games[0];
    return {
      igdb_id: game.id,
      igdb_slug: game.slug,
      title: game.name,
      cover_url: game.cover?.url
        ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
        : undefined,
      release_date: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
        : undefined,
      platforms: (game.platforms?.map((p) => normalizePlatform(p.name)).filter((p): p is string => p !== null) ?? []),
      description: game.summary,
    };
  },
});

// Import a game from IGDB into our database
export const importGame = action({
  args: { igdb_id: v.number() },
  returns: v.id("games"),
  handler: async (ctx, args): Promise<Id<"games">> => {
    const games = await igdbRequest(
      "/games",
      `where id = ${args.igdb_id};
       fields name, slug, cover.url, first_release_date, platforms.name, summary;`
    ) as IgdbGame[];

    if (games.length === 0) {
      throw new Error(`Game not found: ${args.igdb_id}`);
    }

    const game = games[0];

    const gameId: Id<"games"> = await ctx.runMutation(internal.games.upsertFromIgdbInternal, {
      igdb_id: game.id,
      igdb_slug: game.slug,
      title: game.name,
      cover_url: game.cover?.url
        ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
        : undefined,
      release_date: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
        : undefined,
      platforms: (game.platforms?.map((p) => normalizePlatform(p.name)).filter((p): p is string => p !== null) ?? []),
      description: game.summary,
    });

    return gameId;
  },
});

// Search by title and import first result
// Tries exact match first, then falls back to fuzzy search
export const searchAndImport = action({
  args: { title: v.string() },
  returns: v.union(v.id("games"), v.null()),
  handler: async (ctx, args): Promise<Id<"games"> | null> => {
    // First try exact name match (case-insensitive)
    let games = await igdbRequest(
      "/games",
      `where name ~ "${args.title}";
       fields name, slug, cover.url, first_release_date, platforms.name, summary;
       limit 1;`
    ) as IgdbGame[];

    // Fall back to fuzzy search if no exact match
    if (games.length === 0) {
      games = await igdbRequest(
        "/games",
        `search "${args.title}";
         fields name, slug, cover.url, first_release_date, platforms.name, summary;
         limit 1;`
      ) as IgdbGame[];
    }

    if (games.length === 0) {
      return null;
    }

    const game = games[0];

    const gameId: Id<"games"> = await ctx.runMutation(internal.games.upsertFromIgdbInternal, {
      igdb_id: game.id,
      igdb_slug: game.slug,
      title: game.name,
      cover_url: game.cover?.url
        ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
        : undefined,
      release_date: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
        : undefined,
      platforms: (game.platforms?.map((p) => normalizePlatform(p.name)).filter((p): p is string => p !== null) ?? []),
      description: game.summary,
    });

    return gameId;
  },
});

// Normalize IGDB platform names to our simplified platform names
function normalizePlatform(name: string): string | null {
  const lower = name.toLowerCase();

  if (lower.includes("pc") || lower.includes("windows") || lower.includes("linux") || lower.includes("mac")) {
    return "pc";
  }
  if (lower.includes("playstation")) {
    return "playstation";
  }
  if (lower.includes("xbox")) {
    return "xbox";
  }
  if (lower.includes("switch")) {
    return "switch";
  }

  return null;
}

// Type for IGDB API response
interface IgdbGame {
  id: number;
  slug: string;
  name: string;
  cover?: { url: string };
  first_release_date?: number;
  platforms?: Array<{ name: string }>;
  summary?: string;
}
