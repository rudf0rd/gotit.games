import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

// Seed sample games into the database via IGDB
export const seedSampleGames = action({
  args: {},
  handler: async (ctx) => {
    console.log("Seeding sample games via IGDB...");

    // Make sure subscriptions are seeded
    await ctx.runMutation(api.subscriptions.seed, {});

    // Get subscription IDs
    const gamepass: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "gamepass" }
    );
    const psplus: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "psplus" }
    );

    if (!gamepass || !psplus) {
      throw new Error("Failed to get subscriptions");
    }

    // Sample games by service
    const gamepassGames = [
      "Starfield",
      "Halo Infinite",
      "Forza Horizon 5",
      "Sea of Thieves",
      "Minecraft",
      "The Elder Scrolls V: Skyrim",
      "Doom Eternal",
      "Hi-Fi Rush",
      "Pentiment",
      "Hollow Knight",
      "Celeste",
      "Ori and the Will of the Wisps",
      "Psychonauts 2",
      "Dishonored 2",
      "Prey",
    ];

    const psplusGames = [
      "Returnal",
      "Spider-Man: Miles Morales",
      "Ghost of Tsushima",
      "Ratchet & Clank: Rift Apart",
      "Demon's Souls",
      "Horizon Forbidden West",
      "Stray",
      "Death Stranding",
      "God of War",
      "Uncharted 4",
    ];

    let synced = 0;
    let errors = 0;

    // Import Game Pass games
    for (const title of gamepassGames) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: gamepass._id,
            tier_slug: "standard",
            platform: "pc",
            status: "available" as const,
          });
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: gamepass._id,
            tier_slug: "standard",
            platform: "console",
            status: "available" as const,
          });
          synced++;
          console.log(`[Game Pass] ${title}`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    // Import PS+ games
    for (const title of psplusGames) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: psplus._id,
            tier_slug: "extra",
            platform: "console",
            status: "available" as const,
          });
          synced++;
          console.log(`[PS+] ${title}`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    return { synced, errors, total: gamepassGames.length + psplusGames.length };
  },
});
