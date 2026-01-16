import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import type { SyncResult } from "./gamepass";

// Ubisoft Store URLs
const UBISOFT_CATALOG_URL = "https://store.ubisoft.com/us/ubisoftplus/games";
const UBISOFT_API_URL = "https://store.ubisoft.com/api/catalog/search";

// Ubisoft product structure (from their store API)
interface UbisoftProduct {
  id: string;
  name: string;
  shortDescription?: string;
  imageUrl?: string;
  releaseDate?: string;
  platforms?: string[];
  subscriptionType?: string; // "classics" or "premium"
}

// Known Ubisoft+ games (manually maintained fallback list)
// This is used when the API/scrape fails
export const KNOWN_UBISOFT_GAMES: Array<{
  title: string;
  tier: "classics" | "premium";
  platforms: string[];
}> = [
  { title: "Assassin's Creed Mirage", tier: "premium", platforms: ["pc", "console"] },
  { title: "Assassin's Creed Valhalla", tier: "classics", platforms: ["pc", "console"] },
  { title: "Assassin's Creed Odyssey", tier: "classics", platforms: ["pc", "console"] },
  { title: "Assassin's Creed Origins", tier: "classics", platforms: ["pc", "console"] },
  { title: "Far Cry 6", tier: "classics", platforms: ["pc", "console"] },
  { title: "Far Cry 5", tier: "classics", platforms: ["pc", "console"] },
  { title: "Far Cry New Dawn", tier: "classics", platforms: ["pc", "console"] },
  { title: "Watch Dogs: Legion", tier: "classics", platforms: ["pc", "console"] },
  { title: "Watch Dogs 2", tier: "classics", platforms: ["pc", "console"] },
  { title: "Rainbow Six Siege", tier: "classics", platforms: ["pc", "console"] },
  { title: "The Division 2", tier: "classics", platforms: ["pc", "console"] },
  { title: "Ghost Recon Breakpoint", tier: "classics", platforms: ["pc", "console"] },
  { title: "Immortals Fenyx Rising", tier: "classics", platforms: ["pc", "console"] },
  { title: "Riders Republic", tier: "classics", platforms: ["pc", "console"] },
  { title: "Skull and Bones", tier: "premium", platforms: ["pc", "console"] },
  { title: "Avatar: Frontiers of Pandora", tier: "premium", platforms: ["pc", "console"] },
  { title: "Prince of Persia: The Lost Crown", tier: "premium", platforms: ["pc", "console"] },
  { title: "Star Wars Outlaws", tier: "premium", platforms: ["pc", "console"] },
  { title: "Anno 1800", tier: "classics", platforms: ["pc"] },
  { title: "The Crew Motorfest", tier: "premium", platforms: ["pc", "console"] },
  { title: "For Honor", tier: "classics", platforms: ["pc", "console"] },
  { title: "Scott Pilgrim vs. The World", tier: "classics", platforms: ["pc", "console"] },
  { title: "Child of Light", tier: "classics", platforms: ["pc", "console"] },
  { title: "Valiant Hearts: The Great War", tier: "classics", platforms: ["pc", "console"] },
  { title: "Rayman Legends", tier: "classics", platforms: ["pc", "console"] },
  { title: "Steep", tier: "classics", platforms: ["pc", "console"] },
  { title: "Trackmania", tier: "classics", platforms: ["pc"] },
  { title: "Trials Rising", tier: "classics", platforms: ["pc", "console"] },
  { title: "South Park: The Fractured but Whole", tier: "classics", platforms: ["pc", "console"] },
  { title: "South Park: The Stick of Truth", tier: "classics", platforms: ["pc", "console"] },
];

// Try to fetch from Ubisoft's store API (may not always work)
export async function fetchUbisoftCatalog(): Promise<UbisoftProduct[]> {
  try {
    // Try the search API with Ubisoft+ filter
    const response = await fetch(`${UBISOFT_API_URL}?subscription=ubisoftplus&pageSize=100`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Ubisoft API error: ${response.status}`);
    }

    const data = await response.json();
    return data.products || [];
  } catch (e) {
    console.warn("Ubisoft API fetch failed, using fallback data:", e);
    return [];
  }
}

// Internal mutation to upsert Ubisoft+ game
export const upsertUbisoftGame = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    cover_url: v.optional(v.string()),
    release_date: v.optional(v.string()),
    subscription_id: v.id("subscriptions"),
    tier_slug: v.string(),
    platforms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if game exists by title
    let game = await ctx.db
      .query("games")
      .withSearchIndex("search_title", (q) => q.search("title", args.title))
      .first();

    // If no match, create new game
    if (!game) {
      const gameId = await ctx.db.insert("games", {
        title: args.title,
        description: args.description,
        cover_url: args.cover_url,
        release_date: args.release_date,
        platforms: args.platforms,
        updated_at: Date.now(),
      });
      game = await ctx.db.get(gameId);
    }

    if (!game) return null;

    // Create/update catalog entries for each platform
    for (const platform of args.platforms) {
      const existingEntries = await ctx.db
        .query("catalog_entries")
        .withIndex("by_game", (q) => q.eq("game_id", game!._id))
        .collect();

      const existing = existingEntries.find(
        (e) => e.subscription_id === args.subscription_id && e.platform === platform
      );

      const entryData = {
        game_id: game._id,
        subscription_id: args.subscription_id,
        tier_slug: args.tier_slug,
        platform,
        status: "available" as const,
        last_verified_at: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, entryData);
      } else {
        await ctx.db.insert("catalog_entries", entryData);
      }
    }

    return game._id;
  },
});

// Main sync action for Ubisoft+
export const syncUbisoftPlus = action({
  args: {
    limit: v.optional(v.number()),
    useFallback: v.optional(v.boolean()), // Force use of fallback data
  },
  handler: async (ctx, args): Promise<SyncResult> => {
    console.log("Starting Ubisoft+ sync...");

    // Get the Ubisoft+ subscription
    const ubisoftSub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "ubisoftplus" }
    );

    if (!ubisoftSub) {
      await ctx.runMutation(api.subscriptions.seed, {});
      const seededSub: Doc<"subscriptions"> | null = await ctx.runQuery(
        api.subscriptions.getBySlug,
        { slug: "ubisoftplus" }
      );
      if (!seededSub) {
        return {
          status: "error",
          synced: 0,
          errors: 1,
          total: 0,
          message: "Failed to find or create ubisoftplus subscription",
        };
      }
      return await syncUbisoftInternal(ctx, seededSub._id, args.limit, args.useFallback);
    }

    return await syncUbisoftInternal(ctx, ubisoftSub._id, args.limit, args.useFallback);
  },
});

async function syncUbisoftInternal(
  ctx: ActionCtx,
  subscriptionId: Id<"subscriptions">,
  limit?: number,
  useFallback?: boolean
): Promise<SyncResult> {
  let synced = 0;
  let errors = 0;
  let products: Array<{ title: string; tier: string; platforms: string[]; description?: string; cover_url?: string }> = [];

  // Try to fetch from API unless fallback is forced
  if (!useFallback) {
    try {
      console.log("Attempting to fetch Ubisoft+ catalog from API...");
      const apiProducts = await fetchUbisoftCatalog();

      if (apiProducts.length > 0) {
        console.log(`Found ${apiProducts.length} products from API`);
        products = apiProducts.map((p) => ({
          title: p.name,
          tier: p.subscriptionType === "premium" ? "premium" : "classics",
          platforms: p.platforms || ["pc", "console"],
          description: p.shortDescription,
          cover_url: p.imageUrl,
        }));
      }
    } catch (e) {
      console.warn("API fetch failed:", e);
    }
  }

  // Fall back to known games list if API didn't work
  if (products.length === 0) {
    console.log("Using fallback game list for Ubisoft+");
    products = KNOWN_UBISOFT_GAMES.map((g) => ({
      title: g.title,
      tier: g.tier,
      platforms: g.platforms,
    }));
  }

  // Apply limit if specified
  const productsToSync = limit ? products.slice(0, limit) : products;
  const total = productsToSync.length;

  console.log(`Syncing ${total} Ubisoft+ games...`);

  for (const product of productsToSync) {
    try {
      await ctx.runMutation(internal.sync.ubisoftplus.upsertUbisoftGame, {
        title: product.title,
        description: product.description,
        cover_url: product.cover_url,
        subscription_id: subscriptionId,
        tier_slug: product.tier,
        platforms: product.platforms,
      });

      synced++;

      if (synced % 20 === 0) {
        console.log(`Synced ${synced}/${total} Ubisoft+ games...`);
      }
    } catch (e) {
      console.error(`Error processing Ubisoft+ game ${product.title}:`, e);
      errors++;
    }
  }

  console.log(`Ubisoft+ sync complete: ${synced} synced, ${errors} errors`);

  return {
    status: errors === 0 ? "success" : "partial",
    synced,
    errors,
    total,
    subscription_id: subscriptionId,
    message: products === KNOWN_UBISOFT_GAMES.map((g) => ({ title: g.title, tier: g.tier, platforms: g.platforms }))
      ? "Used fallback data - API may be unavailable"
      : undefined,
  };
}

// Get Ubisoft+ sync status
export const getSyncStatus = action({
  args: {},
  handler: async (ctx): Promise<{ status: string; subscription_id?: Id<"subscriptions">; game_count?: number }> => {
    const ubisoftSub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "ubisoftplus" }
    );

    if (!ubisoftSub) {
      return { status: "not_configured" };
    }

    const entries = await ctx.runQuery(api.catalog.getEntriesBySubscription, {
      subscription_id: ubisoftSub._id,
    });

    return {
      status: "ready",
      subscription_id: ubisoftSub._id,
      game_count: entries?.length ?? 0,
    };
  },
});

// Manual entry point for adding games (useful for manual updates)
export const addGame = action({
  args: {
    title: v.string(),
    tier: v.union(v.literal("classics"), v.literal("premium")),
    platforms: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const ubisoftSub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "ubisoftplus" }
    );

    if (!ubisoftSub) {
      return { success: false, message: "Ubisoft+ subscription not found" };
    }

    try {
      await ctx.runMutation(internal.sync.ubisoftplus.upsertUbisoftGame, {
        title: args.title,
        subscription_id: ubisoftSub._id,
        tier_slug: args.tier,
        platforms: args.platforms,
      });

      return { success: true, message: `Added ${args.title} to Ubisoft+ ${args.tier}` };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Unknown error" };
    }
  },
});
