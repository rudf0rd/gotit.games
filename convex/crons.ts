import { cronJobs } from "convex/server";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { SyncResult } from "./sync/gamepass";

const crons = cronJobs();

// Internal action handlers for cron jobs
// These call the public sync actions using ctx.runAction

export const runGamePassSync = internalAction({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    console.log("[CRON] Starting Game Pass sync...");
    // Dynamic import to get the sync functions
    const { fetchGamePassCatalog, fetchProductDetails, extractGameData, SIGLS_COLLECTIONS } = await import("./sync/gamepass");

    try {
      // Fetch catalogs
      const consoleIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.ALL_CONSOLE);
      const pcIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.PC_GAMES);
      const allProductIds = [...new Set([...consoleIds, ...pcIds])];

      console.log(`[CRON] Found ${allProductIds.length} Game Pass products`);

      // Fetch product details (limit to 100 for cron)
      const products = await fetchProductDetails(allProductIds.slice(0, 100));

      let synced = 0;
      for (const product of products) {
        const gameData = extractGameData(product);
        if (gameData) {
          // Use internal mutation
          await ctx.runMutation(internal.sync.gamepass.upsertGameAndCatalog, {
            title: gameData.title,
            description: gameData.description,
            cover_url: gameData.cover_url,
            release_date: gameData.release_date,
            ms_product_id: gameData.ms_product_id,
            subscription_id: await getGamePassSubscriptionId(ctx),
            tier_slug: "standard",
            platforms: ["console", "pc"],
          });
          synced++;
        }
      }

      console.log(`[CRON] Game Pass sync complete: ${synced} games synced`);
      return { status: "success", synced, errors: 0, total: allProductIds.length };
    } catch (e) {
      console.error("[CRON] Game Pass sync failed:", e);
      return { status: "error", synced: 0, errors: 1, total: 0, message: String(e) };
    }
  },
});

// Helper to get gamepass subscription ID
async function getGamePassSubscriptionId(ctx: any): Promise<any> {
  const { api } = await import("./_generated/api");
  const sub = await ctx.runQuery(api.subscriptions.getBySlug, { slug: "gamepass" });
  if (!sub) {
    await ctx.runMutation(api.subscriptions.seed, {});
    const seeded = await ctx.runQuery(api.subscriptions.getBySlug, { slug: "gamepass" });
    return seeded!._id;
  }
  return sub._id;
}

export const runEaPlaySync = internalAction({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    console.log("[CRON] Starting EA Play sync...");
    const { fetchGamePassCatalog, fetchProductDetails, extractGameData, SIGLS_COLLECTIONS } = await import("./sync/gamepass");

    try {
      const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.EA_PLAY);
      console.log(`[CRON] Found ${productIds.length} EA Play products`);

      const products = await fetchProductDetails(productIds.slice(0, 50));

      let synced = 0;
      for (const product of products) {
        const gameData = extractGameData(product);
        if (gameData) {
          await ctx.runMutation(internal.sync.eaplay.upsertEaPlayGame, {
            title: gameData.title,
            description: gameData.description,
            cover_url: gameData.cover_url,
            release_date: gameData.release_date,
            ms_product_id: gameData.ms_product_id,
            subscription_id: await getEaPlaySubscriptionId(ctx),
            tier_slug: "standard",
            platforms: ["console", "pc"],
          });
          synced++;
        }
      }

      console.log(`[CRON] EA Play sync complete: ${synced} games synced`);
      return { status: "success", synced, errors: 0, total: productIds.length };
    } catch (e) {
      console.error("[CRON] EA Play sync failed:", e);
      return { status: "error", synced: 0, errors: 1, total: 0, message: String(e) };
    }
  },
});

async function getEaPlaySubscriptionId(ctx: any): Promise<any> {
  const { api } = await import("./_generated/api");
  const sub = await ctx.runQuery(api.subscriptions.getBySlug, { slug: "eaplay" });
  if (!sub) {
    await ctx.runMutation(api.subscriptions.seed, {});
    const seeded = await ctx.runQuery(api.subscriptions.getBySlug, { slug: "eaplay" });
    return seeded!._id;
  }
  return sub._id;
}

export const runPsPlusSync = internalAction({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    console.log("[CRON] Starting PS Plus sync...");
    const { fetchPsPlusCatalog, extractPsGameData, PS_PLUS_CATEGORIES } = await import("./sync/psplus");

    try {
      const { products } = await fetchPsPlusCatalog(PS_PLUS_CATEGORIES.GAME_CATALOG, 0, 50);
      console.log(`[CRON] Found ${products.length} PS Plus products`);

      let synced = 0;
      for (const product of products) {
        const gameData = extractPsGameData(product);
        if (gameData) {
          await ctx.runMutation(internal.sync.psplus.upsertPsPlusGame, {
            title: gameData.title,
            description: gameData.description,
            cover_url: gameData.cover_url,
            release_date: gameData.release_date,
            psn_id: gameData.psn_id,
            subscription_id: await getPsPlusSubscriptionId(ctx),
            tier_slug: "extra",
            platforms: gameData.platforms,
          });
          synced++;
        }
      }

      console.log(`[CRON] PS Plus sync complete: ${synced} games synced`);
      return { status: "success", synced, errors: 0, total: products.length };
    } catch (e) {
      console.error("[CRON] PS Plus sync failed:", e);
      return { status: "error", synced: 0, errors: 1, total: 0, message: String(e) };
    }
  },
});

async function getPsPlusSubscriptionId(ctx: any): Promise<any> {
  const { api } = await import("./_generated/api");
  const sub = await ctx.runQuery(api.subscriptions.getBySlug, { slug: "psplus" });
  if (!sub) {
    await ctx.runMutation(api.subscriptions.seed, {});
    const seeded = await ctx.runQuery(api.subscriptions.getBySlug, { slug: "psplus" });
    return seeded!._id;
  }
  return sub._id;
}

export const runUbisoftPlusSync = internalAction({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    console.log("[CRON] Starting Ubisoft+ sync...");
    const { KNOWN_UBISOFT_GAMES } = await import("./sync/ubisoftplus");

    try {
      const subId = await getUbisoftPlusSubscriptionId(ctx);
      let synced = 0;

      for (const game of KNOWN_UBISOFT_GAMES) {
        await ctx.runMutation(internal.sync.ubisoftplus.upsertUbisoftGame, {
          title: game.title,
          subscription_id: subId,
          tier_slug: game.tier,
          platforms: game.platforms,
        });
        synced++;
      }

      console.log(`[CRON] Ubisoft+ sync complete: ${synced} games synced`);
      return { status: "success", synced, errors: 0, total: KNOWN_UBISOFT_GAMES.length };
    } catch (e) {
      console.error("[CRON] Ubisoft+ sync failed:", e);
      return { status: "error", synced: 0, errors: 1, total: 0, message: String(e) };
    }
  },
});

async function getUbisoftPlusSubscriptionId(ctx: any): Promise<any> {
  const { api } = await import("./_generated/api");
  const sub = await ctx.runQuery(api.subscriptions.getBySlug, { slug: "ubisoftplus" });
  if (!sub) {
    await ctx.runMutation(api.subscriptions.seed, {});
    const seeded = await ctx.runQuery(api.subscriptions.getBySlug, { slug: "ubisoftplus" });
    return seeded!._id;
  }
  return sub._id;
}

export const checkLeavingSoon = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[CRON] Checking for games leaving soon...");

    const twoWeeksFromNow = Date.now() + (14 * 24 * 60 * 60 * 1000);

    const allEntries = await ctx.db
      .query("catalog_entries")
      .collect();

    let updated = 0;
    for (const entry of allEntries) {
      if (entry.leaving_date && entry.leaving_date < twoWeeksFromNow && entry.status !== "leaving_soon") {
        await ctx.db.patch(entry._id, { status: "leaving_soon" });
        updated++;
      }
    }

    console.log(`[CRON] Updated ${updated} entries to leaving_soon status`);
    return { updated };
  },
});

// Schedule the cron jobs
// Sync Game Pass weekly on Sunday at 6:00 AM UTC
crons.weekly(
  "sync game pass catalog",
  { dayOfWeek: "sunday", hourUTC: 6, minuteUTC: 0 },
  internal.crons.runGamePassSync
);

// Sync EA Play weekly on Sunday at 6:30 AM UTC
crons.weekly(
  "sync ea play catalog",
  { dayOfWeek: "sunday", hourUTC: 6, minuteUTC: 30 },
  internal.crons.runEaPlaySync
);

// Sync PS Plus weekly on Sunday at 7:00 AM UTC
crons.weekly(
  "sync ps plus catalog",
  { dayOfWeek: "sunday", hourUTC: 7, minuteUTC: 0 },
  internal.crons.runPsPlusSync
);

// Sync Ubisoft+ weekly on Sunday at 7:30 AM UTC
crons.weekly(
  "sync ubisoft plus catalog",
  { dayOfWeek: "sunday", hourUTC: 7, minuteUTC: 30 },
  internal.crons.runUbisoftPlusSync
);

// Check for leaving soon daily at 8:00 AM UTC
crons.daily(
  "check leaving soon",
  { hourUTC: 8, minuteUTC: 0 },
  internal.crons.checkLeavingSoon
);

export default crons;
