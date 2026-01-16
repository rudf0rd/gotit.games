import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { v } from "convex/values";

// Microsoft Game Pass API endpoints
const GAMEPASS_SIGLS_API = "https://catalog.gamepass.com/sigls/v2";
const MS_DISPLAY_CATALOG_API = "https://displaycatalog.mp.microsoft.com/v7.0/products";

// Known Sigls collection IDs
export const SIGLS_COLLECTIONS = {
  ALL_CONSOLE: "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
  PC_GAMES: "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
  EA_PLAY: "b8900d09-a491-44cc-916e-32b5acae621b",
} as const;

// Sync result type
export type SyncResult = {
  status: "success" | "partial" | "error" | "api_error";
  synced: number;
  errors: number;
  total: number;
  message?: string;
  subscription_id?: Id<"subscriptions">;
};

// Microsoft product data structure (simplified)
interface MsProduct {
  ProductId: string;
  LocalizedProperties: Array<{
    ProductTitle: string;
    ShortDescription?: string;
    ProductDescription?: string;
    Images?: Array<{
      ImagePurpose: string;
      Uri: string;
    }>;
  }>;
  MarketProperties?: Array<{
    OriginalReleaseDate?: string;
  }>;
  Properties?: {
    Category?: string;
    Categories?: string[];
  };
  DisplaySkuAvailabilities?: Array<{
    Sku?: {
      Properties?: {
        FulfillmentData?: {
          ProductId?: string;
        };
      };
    };
  }>;
}

// Fetch product IDs from Game Pass catalog
export async function fetchGamePassCatalog(
  collectionId: string,
  market: string = "US",
  language: string = "en-us"
): Promise<string[]> {
  const url = `${GAMEPASS_SIGLS_API}?id=${collectionId}&language=${language}&market=${market}`;

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "gotit.games/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Game Pass API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // First item is metadata, rest are product IDs
  // Format: [{ siglId, title, ... }, { id: "..." }, { id: "..." }, ...]
  return data
    .slice(1) // Skip metadata
    .map((item: { id?: string }) => item.id)
    .filter(Boolean);
}

// Fetch product details from Microsoft Store API
export async function fetchProductDetails(
  productIds: string[],
  market: string = "US",
  language: string = "en-us"
): Promise<MsProduct[]> {
  if (productIds.length === 0) return [];

  // API supports up to 20 products per request
  const batchSize = 20;
  const products: MsProduct[] = [];

  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    const bigIds = batch.join(",");

    const url = `${MS_DISPLAY_CATALOG_API}?bigIds=${bigIds}&market=${market}&languages=${language}`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "gotit.games/1.0",
        "MS-CV": `gotit.${Date.now()}`, // Required correlation vector
      },
    });

    if (!response.ok) {
      console.error(`MS Store API error for batch: ${response.status}`);
      continue;
    }

    const data = await response.json();
    if (data.Products) {
      products.push(...data.Products);
    }

    // Small delay between batches to be respectful
    if (i + batchSize < productIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return products;
}

// Extract game data from Microsoft product
export function extractGameData(product: MsProduct): {
  title: string;
  description?: string;
  cover_url?: string;
  release_date?: string;
  ms_product_id: string;
} | null {
  const localized = product.LocalizedProperties?.[0];
  if (!localized?.ProductTitle) return null;

  // Find the best cover image (BoxArt or Poster)
  const images = localized.Images || [];
  const coverImage = images.find((img) =>
    img.ImagePurpose === "BoxArt" ||
    img.ImagePurpose === "Poster" ||
    img.ImagePurpose === "SuperHeroArt"
  );

  // Get release date
  const releaseDate = product.MarketProperties?.[0]?.OriginalReleaseDate;

  return {
    title: localized.ProductTitle,
    description: localized.ShortDescription || localized.ProductDescription,
    cover_url: coverImage?.Uri ? `https:${coverImage.Uri}` : undefined,
    release_date: releaseDate?.split("T")[0], // Just the date part
    ms_product_id: product.ProductId,
  };
}

// Determine platforms from product data
export function extractPlatforms(product: MsProduct): string[] {
  const platforms: string[] = [];

  // Check categories for platform hints
  const categories = product.Properties?.Categories || [];
  const category = product.Properties?.Category || "";

  // Xbox/Console
  if (category.includes("Games") || categories.some((c) => c.includes("Xbox"))) {
    platforms.push("console");
  }

  // PC
  if (categories.some((c) => c.includes("PC") || c.includes("Windows"))) {
    platforms.push("pc");
  }

  // If no specific platform detected, assume both (Game Pass usually has both)
  if (platforms.length === 0) {
    platforms.push("console", "pc");
  }

  return platforms;
}

// Internal mutation to upsert a game and catalog entry
export const upsertGameAndCatalog = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    cover_url: v.optional(v.string()),
    release_date: v.optional(v.string()),
    ms_product_id: v.string(),
    subscription_id: v.id("subscriptions"),
    tier_slug: v.string(),
    platforms: v.array(v.string()),
    is_ea_play: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if game exists by title (simple matching for now)
    // In production, you'd want fuzzy matching or a dedicated mapping table
    let game = await ctx.db
      .query("games")
      .withSearchIndex("search_title", (q) => q.search("title", args.title))
      .first();

    // If no exact match, create new game
    if (!game) {
      const gameId = await ctx.db.insert("games", {
        title: args.title,
        description: args.description,
        cover_url: args.cover_url,
        release_date: args.release_date,
        platforms: args.platforms.includes("pc")
          ? (args.platforms.includes("console") ? ["pc", "xbox"] : ["pc"])
          : ["xbox"],
        updated_at: Date.now(),
      });
      game = await ctx.db.get(gameId);
    }

    if (!game) return null;

    // Create/update catalog entries for each platform
    for (const platform of args.platforms) {
      // Check for existing entry
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
        service_game_id: args.ms_product_id,
        last_verified_at: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, entryData);
      } else {
        await ctx.db.insert("catalog_entries", entryData);
      }
    }

    // If EA Play game, also add to EA Play subscription
    if (args.is_ea_play) {
      const eaPlaySub = await ctx.db
        .query("subscriptions")
        .withIndex("by_slug", (q) => q.eq("slug", "eaplay"))
        .first();

      if (eaPlaySub) {
        for (const platform of args.platforms) {
          const existingEntries = await ctx.db
            .query("catalog_entries")
            .withIndex("by_game", (q) => q.eq("game_id", game!._id))
            .collect();

          const existing = existingEntries.find(
            (e) => e.subscription_id === eaPlaySub._id && e.platform === platform
          );

          const entryData = {
            game_id: game._id,
            subscription_id: eaPlaySub._id,
            tier_slug: "standard",
            platform,
            status: "available" as const,
            service_game_id: args.ms_product_id,
            last_verified_at: Date.now(),
          };

          if (existing) {
            await ctx.db.patch(existing._id, entryData);
          } else {
            await ctx.db.insert("catalog_entries", entryData);
          }
        }
      }
    }

    return game._id;
  },
});

// Main sync action for Game Pass
export const syncGamePass = action({
  args: {
    limit: v.optional(v.number()), // For testing, limit number of games
  },
  handler: async (ctx, args): Promise<SyncResult> => {
    console.log("Starting Game Pass sync...");

    // Get the gamepass subscription from the database
    const gamepassSub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "gamepass" }
    );

    if (!gamepassSub) {
      // Seed subscriptions first if not found
      await ctx.runMutation(api.subscriptions.seed, {});
      const seededSub: Doc<"subscriptions"> | null = await ctx.runQuery(
        api.subscriptions.getBySlug,
        { slug: "gamepass" }
      );
      if (!seededSub) {
        return {
          status: "error",
          synced: 0,
          errors: 1,
          total: 0,
          message: "Failed to find or create gamepass subscription",
        };
      }
      return await syncCatalogInternal(ctx, seededSub._id, args.limit);
    }

    return await syncCatalogInternal(ctx, gamepassSub._id, args.limit);
  },
});

async function syncCatalogInternal(
  ctx: ActionCtx,
  subscriptionId: Id<"subscriptions">,
  limit?: number
): Promise<SyncResult> {
  try {
    // Fetch Game Pass catalog (Console + PC combined)
    console.log("Fetching Game Pass catalog...");
    const consoleIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.ALL_CONSOLE);
    const pcIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.PC_GAMES);

    // Combine and dedupe
    const allProductIds = [...new Set([...consoleIds, ...pcIds])];
    console.log(`Found ${allProductIds.length} unique products (${consoleIds.length} console, ${pcIds.length} PC)`);

    // Apply limit if specified (for testing)
    const productIdsToSync = limit ? allProductIds.slice(0, limit) : allProductIds;

    // Fetch EA Play catalog to identify EA games
    let eaPlayIds: Set<string> = new Set();
    try {
      const eaIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.EA_PLAY);
      eaPlayIds = new Set(eaIds);
      console.log(`Found ${eaPlayIds.size} EA Play games`);
    } catch (e) {
      console.warn("Could not fetch EA Play catalog, continuing without EA flagging");
    }

    // Fetch product details
    console.log(`Fetching details for ${productIdsToSync.length} products...`);
    const products = await fetchProductDetails(productIdsToSync);
    console.log(`Got details for ${products.length} products`);

    let synced = 0;
    let errors = 0;

    // Process each product
    for (const product of products) {
      try {
        const gameData = extractGameData(product);
        if (!gameData) {
          errors++;
          continue;
        }

        const platforms = extractPlatforms(product);
        const isEaPlay = eaPlayIds.has(product.ProductId);

        // Determine which platforms this game is on
        const onConsole = consoleIds.includes(product.ProductId);
        const onPc = pcIds.includes(product.ProductId);
        const gamePlatforms = [];
        if (onConsole) gamePlatforms.push("console");
        if (onPc) gamePlatforms.push("pc");
        if (gamePlatforms.length === 0) gamePlatforms.push(...platforms);

        await ctx.runMutation(internal.sync.gamepass.upsertGameAndCatalog, {
          title: gameData.title,
          description: gameData.description,
          cover_url: gameData.cover_url,
          release_date: gameData.release_date,
          ms_product_id: gameData.ms_product_id,
          subscription_id: subscriptionId,
          tier_slug: "standard", // Most Game Pass games are Standard tier
          platforms: gamePlatforms,
          is_ea_play: isEaPlay,
        });

        synced++;

        // Log progress every 50 games
        if (synced % 50 === 0) {
          console.log(`Synced ${synced}/${products.length} games...`);
        }
      } catch (e) {
        console.error(`Error processing product ${product.ProductId}:`, e);
        errors++;
      }
    }

    console.log(`Game Pass sync complete: ${synced} synced, ${errors} errors`);

    return {
      status: errors === 0 ? "success" : "partial",
      synced,
      errors,
      total: productIdsToSync.length,
      subscription_id: subscriptionId,
    };
  } catch (e) {
    console.error(`Failed to sync Game Pass catalog:`, e);
    return {
      status: "api_error",
      synced: 0,
      errors: 1,
      total: 0,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// Get current sync status
export const getSyncStatus = action({
  args: {},
  handler: async (ctx): Promise<{ status: string; subscription_id?: Id<"subscriptions">; game_count?: number }> => {
    const gamepassSub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "gamepass" }
    );

    if (!gamepassSub) {
      return { status: "not_configured" };
    }

    // Count catalog entries for Game Pass
    const entries = await ctx.runQuery(api.catalog.getEntriesBySubscription, {
      subscription_id: gamepassSub._id,
    });

    return {
      status: "ready",
      subscription_id: gamepassSub._id,
      game_count: entries?.length ?? 0,
    };
  },
});
