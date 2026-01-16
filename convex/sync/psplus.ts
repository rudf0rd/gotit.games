import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import type { SyncResult } from "./gamepass";

// PlayStation Store GraphQL API
const PS_GRAPHQL_API = "https://web.np.playstation.com/api/graphql/v1/op";

// Known category IDs for PS Plus
export const PS_PLUS_CATEGORIES = {
  GAME_CATALOG: "3a7006fe-e26f-49fe-87e5-4473d7ed0fb2", // PS Plus Extra/Premium Game Catalog
  CLASSICS: "13d915bc-8a8e-4723-8474-c6f922b6de83", // PS Plus Premium Classics
} as const;

// GraphQL operation hashes (these may need to be updated if Sony changes them)
// You can get fresh hashes by inspecting network requests on the PS Store website
// Last updated: 2026-01-15 from store.playstation.com
const GRAPHQL_HASHES = {
  categoryGridRetrieve: "257713466fc3264850aa473409a29088e3a4115e6e69e9fb3e061c8dd5b9f5c6",
};

// PS Store product structure
interface PsProduct {
  id: string;
  name: string;
  descriptions?: Array<{
    type: string;
    value: string;
  }>;
  media?: {
    images?: Array<{
      role: string;
      url: string;
    }>;
  };
  releaseDate?: string;
  platforms?: string[];
  storeDisplayClassification?: string;
}

interface PsCategoryResponse {
  data?: {
    categoryGridRetrieve?: {
      products?: PsProduct[];
      pageInfo?: {
        totalCount: number;
        offset: number;
        size: number;
      };
    };
  };
}

// Fetch PS Plus catalog from Sony's GraphQL API
export async function fetchPsPlusCatalog(
  categoryId: string,
  offset: number = 0,
  size: number = 100,
  country: string = "US",
  language: string = "en"
): Promise<{ products: PsProduct[]; totalCount: number }> {
  const variables = {
    id: categoryId,
    pageArgs: { offset, size },
    sortBy: { name: "productReleaseDate", isAscending: false },
    filterBy: [],
    facetOptions: [],
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: GRAPHQL_HASHES.categoryGridRetrieve,
    },
  };

  const url = new URL(PS_GRAPHQL_API);
  url.searchParams.set("operationName", "categoryGridRetrieve");
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify(extensions));

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": `${language}-${country}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-PSN-Store-Locale-Override": `${language}-${country}`,
      "x-apollo-operation-name": "categoryGridRetrieve",
    },
  });

  if (!response.ok) {
    throw new Error(`PS Store API error: ${response.status} ${response.statusText}`);
  }

  const data: PsCategoryResponse = await response.json();
  const products = data.data?.categoryGridRetrieve?.products || [];
  const totalCount = data.data?.categoryGridRetrieve?.pageInfo?.totalCount || 0;

  return { products, totalCount };
}

// Fetch all products from a category (handles pagination)
export async function fetchAllPsPlusProducts(categoryId: string): Promise<PsProduct[]> {
  const allProducts: PsProduct[] = [];
  const pageSize = 100;
  let offset = 0;
  let totalCount = 0;

  do {
    const { products, totalCount: total } = await fetchPsPlusCatalog(categoryId, offset, pageSize);
    totalCount = total;
    allProducts.push(...products);
    offset += pageSize;

    // Small delay between requests
    if (offset < totalCount) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } while (offset < totalCount);

  return allProducts;
}

// Extract game data from PS product
export function extractPsGameData(product: PsProduct): {
  title: string;
  description?: string;
  cover_url?: string;
  release_date?: string;
  psn_id: string;
  platforms: string[];
} | null {
  if (!product.name) return null;

  // Find cover image - prefer MASTER, then GAMEHUB_COVER_ART, then BACKGROUND
  const images = product.media?.images || [];
  const coverImage =
    images.find((img) => img.role === "MASTER") ||
    images.find((img) => img.role === "GAMEHUB_COVER_ART") ||
    images.find((img) => img.role === "BACKGROUND");

  // Get description
  const descriptions = product.descriptions || [];
  const shortDesc = descriptions.find((d) => d.type === "SHORT_DESCRIPTION")?.value;
  const longDesc = descriptions.find((d) => d.type === "LONG_DESCRIPTION")?.value;

  // Determine platforms
  const platforms = product.platforms || [];
  const normalizedPlatforms: string[] = [];
  if (platforms.some((p) => p.includes("PS5") || p.includes("ps5"))) {
    normalizedPlatforms.push("ps5");
  }
  if (platforms.some((p) => p.includes("PS4") || p.includes("ps4"))) {
    normalizedPlatforms.push("ps4");
  }
  if (normalizedPlatforms.length === 0) {
    normalizedPlatforms.push("console"); // Default to generic console
  }

  return {
    title: product.name,
    description: shortDesc || longDesc,
    cover_url: coverImage?.url,
    release_date: product.releaseDate?.split("T")[0],
    psn_id: product.id,
    platforms: normalizedPlatforms,
  };
}

// Internal mutation to upsert PS Plus game
export const upsertPsPlusGame = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    cover_url: v.optional(v.string()),
    release_date: v.optional(v.string()),
    psn_id: v.string(),
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
        platforms: args.platforms.includes("ps5") || args.platforms.includes("ps4")
          ? ["playstation"]
          : ["playstation"],
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
        service_game_id: args.psn_id,
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

// Main sync action for PS Plus
export const syncPsPlus = action({
  args: {
    limit: v.optional(v.number()),
    includeClassics: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<SyncResult> => {
    console.log("Starting PlayStation Plus sync...");

    // Get the PS Plus subscription
    const psPlusSub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "psplus" }
    );

    if (!psPlusSub) {
      await ctx.runMutation(api.subscriptions.seed, {});
      const seededSub: Doc<"subscriptions"> | null = await ctx.runQuery(
        api.subscriptions.getBySlug,
        { slug: "psplus" }
      );
      if (!seededSub) {
        return {
          status: "error",
          synced: 0,
          errors: 1,
          total: 0,
          message: "Failed to find or create psplus subscription",
        };
      }
      return await syncPsPlusInternal(ctx, seededSub._id, args.limit, args.includeClassics);
    }

    return await syncPsPlusInternal(ctx, psPlusSub._id, args.limit, args.includeClassics);
  },
});

async function syncPsPlusInternal(
  ctx: ActionCtx,
  subscriptionId: Id<"subscriptions">,
  limit?: number,
  includeClassics?: boolean
): Promise<SyncResult> {
  try {
    let allProducts: PsProduct[] = [];
    let synced = 0;
    let errors = 0;

    // Fetch Game Catalog (Extra tier)
    console.log("Fetching PS Plus Game Catalog...");
    try {
      const catalogProducts = await fetchAllPsPlusProducts(PS_PLUS_CATEGORIES.GAME_CATALOG);
      console.log(`Found ${catalogProducts.length} Game Catalog products`);
      allProducts.push(...catalogProducts.map((p) => ({ ...p, tier: "extra" })));
    } catch (e) {
      console.error("Failed to fetch Game Catalog:", e);
      // Continue with classics if available
    }

    // Fetch Classics (Premium tier) if requested
    if (includeClassics) {
      console.log("Fetching PS Plus Classics...");
      try {
        const classicsProducts = await fetchAllPsPlusProducts(PS_PLUS_CATEGORIES.CLASSICS);
        console.log(`Found ${classicsProducts.length} Classics products`);
        allProducts.push(...classicsProducts.map((p) => ({ ...p, tier: "premium" })));
      } catch (e) {
        console.error("Failed to fetch Classics:", e);
      }
    }

    if (allProducts.length === 0) {
      return {
        status: "api_error",
        synced: 0,
        errors: 1,
        total: 0,
        message: "Could not fetch any PS Plus products. The GraphQL hash may need updating.",
      };
    }

    // Apply limit if specified
    const productsToSync = limit ? allProducts.slice(0, limit) : allProducts;

    // Process each product
    for (const product of productsToSync) {
      try {
        const gameData = extractPsGameData(product);
        if (!gameData) {
          errors++;
          continue;
        }

        // Determine tier based on which catalog it came from
        const tier = (product as PsProduct & { tier?: string }).tier || "extra";

        await ctx.runMutation(internal.sync.psplus.upsertPsPlusGame, {
          title: gameData.title,
          description: gameData.description,
          cover_url: gameData.cover_url,
          release_date: gameData.release_date,
          psn_id: gameData.psn_id,
          subscription_id: subscriptionId,
          tier_slug: tier,
          platforms: gameData.platforms,
        });

        synced++;

        if (synced % 50 === 0) {
          console.log(`Synced ${synced}/${productsToSync.length} PS Plus games...`);
        }
      } catch (e) {
        console.error(`Error processing PS product:`, e);
        errors++;
      }
    }

    console.log(`PS Plus sync complete: ${synced} synced, ${errors} errors`);

    return {
      status: errors === 0 ? "success" : "partial",
      synced,
      errors,
      total: productsToSync.length,
      subscription_id: subscriptionId,
    };
  } catch (e) {
    console.error(`Failed to sync PS Plus catalog:`, e);
    return {
      status: "api_error",
      synced: 0,
      errors: 1,
      total: 0,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// Get PS Plus sync status
export const getSyncStatus = action({
  args: {},
  handler: async (ctx): Promise<{ status: string; subscription_id?: Id<"subscriptions">; game_count?: number }> => {
    const psPlusSub: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "psplus" }
    );

    if (!psPlusSub) {
      return { status: "not_configured" };
    }

    const entries = await ctx.runQuery(api.catalog.getEntriesBySubscription, {
      subscription_id: psPlusSub._id,
    });

    return {
      status: "ready",
      subscription_id: psPlusSub._id,
      game_count: entries?.length ?? 0,
    };
  },
});
