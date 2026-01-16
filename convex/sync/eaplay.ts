import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import {
  fetchGamePassCatalog,
  fetchProductDetails,
  extractGameData,
  SIGLS_COLLECTIONS,
  type SyncResult,
} from "./gamepass";

// EA Play uses the same Microsoft Store APIs as Game Pass
// We fetch from the EA Play collection within Game Pass

// Internal mutation to upsert EA Play game
export const upsertEaPlayGame = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    cover_url: v.optional(v.string()),
    release_date: v.optional(v.string()),
    ms_product_id: v.string(),
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
        platforms: args.platforms.includes("pc")
          ? (args.platforms.includes("console") ? ["pc", "xbox", "playstation"] : ["pc"])
          : ["xbox", "playstation"],
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
        service_game_id: args.ms_product_id,
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

// Main sync action for EA Play
export const syncEaPlay = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SyncResult> => {
    console.log("Starting EA Play sync...");

    // Get the EA Play subscription
    const eaPlaySub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "eaplay" }
    );

    if (!eaPlaySub) {
      await ctx.runMutation(api.subscriptions.seed, {});
      const seededSub: Doc<"subscriptions"> | null = await ctx.runQuery(
        api.subscriptions.getBySlug,
        { slug: "eaplay" }
      );
      if (!seededSub) {
        return {
          status: "error",
          synced: 0,
          errors: 1,
          total: 0,
          message: "Failed to find or create eaplay subscription",
        };
      }
      return await syncEaPlayInternal(ctx, seededSub._id, args.limit);
    }

    return await syncEaPlayInternal(ctx, eaPlaySub._id, args.limit);
  },
});

async function syncEaPlayInternal(
  ctx: ActionCtx,
  subscriptionId: Id<"subscriptions">,
  limit?: number
): Promise<SyncResult> {
  try {
    // Fetch EA Play catalog from Microsoft
    console.log("Fetching EA Play catalog from Microsoft...");
    const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.EA_PLAY);
    console.log(`Found ${productIds.length} EA Play products`);

    // Apply limit if specified
    const productIdsToSync = limit ? productIds.slice(0, limit) : productIds;

    // Fetch product details
    console.log(`Fetching details for ${productIdsToSync.length} products...`);
    const products = await fetchProductDetails(productIdsToSync);
    console.log(`Got details for ${products.length} products`);

    let synced = 0;
    let errors = 0;

    for (const product of products) {
      try {
        const gameData = extractGameData(product);
        if (!gameData) {
          errors++;
          continue;
        }

        // EA Play games are typically available on PC and Console
        // Most EA Play games are in the "standard" tier
        await ctx.runMutation(internal.sync.eaplay.upsertEaPlayGame, {
          title: gameData.title,
          description: gameData.description,
          cover_url: gameData.cover_url,
          release_date: gameData.release_date,
          ms_product_id: gameData.ms_product_id,
          subscription_id: subscriptionId,
          tier_slug: "standard",
          platforms: ["pc", "console"],
        });

        synced++;

        if (synced % 50 === 0) {
          console.log(`Synced ${synced}/${products.length} EA Play games...`);
        }
      } catch (e) {
        console.error(`Error processing EA Play product ${product.ProductId}:`, e);
        errors++;
      }
    }

    console.log(`EA Play sync complete: ${synced} synced, ${errors} errors`);

    return {
      status: errors === 0 ? "success" : "partial",
      synced,
      errors,
      total: productIdsToSync.length,
      subscription_id: subscriptionId,
    };
  } catch (e) {
    console.error(`Failed to sync EA Play catalog:`, e);
    return {
      status: "api_error",
      synced: 0,
      errors: 1,
      total: 0,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// Get EA Play sync status
export const getSyncStatus = action({
  args: {},
  handler: async (ctx): Promise<{ status: string; subscription_id?: Id<"subscriptions">; game_count?: number }> => {
    const eaPlaySub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "eaplay" }
    );

    if (!eaPlaySub) {
      return { status: "not_configured" };
    }

    const entries = await ctx.runQuery(api.catalog.getEntriesBySubscription, {
      subscription_id: eaPlaySub._id,
    });

    return {
      status: "ready",
      subscription_id: eaPlaySub._id,
      game_count: entries?.length ?? 0,
    };
  },
});
