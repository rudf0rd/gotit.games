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

// Seed coming soon and leaving soon games for testing
export const seedComingAndLeaving = action({
  args: {},
  handler: async (ctx) => {
    console.log("Seeding coming soon and leaving soon games...");

    // Get subscription IDs
    const gamepass: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "gamepass" }
    );
    const psplus: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "psplus" }
    );
    const eaplay: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "eaplay" }
    );
    const ubisoftplus: Doc<"subscriptions"> | null = await ctx.runQuery(
      api.subscriptions.getBySlug,
      { slug: "ubisoftplus" }
    );

    if (!gamepass || !psplus || !eaplay || !ubisoftplus) {
      throw new Error("Failed to get subscriptions - run seedSampleGames first");
    }

    const now = Date.now();

    // Games coming soon to Game Pass
    const comingSoonGamePass = [
      { title: "Indiana Jones and the Great Circle", days: 5 },
      { title: "Avowed", days: 12 },
      { title: "Fable", days: 21 },
      { title: "South of Midnight", days: 28 },
      { title: "Stalker 2", days: 8 },
      { title: "Microsoft Flight Simulator 2024", days: 15 },
    ];

    // Games leaving Game Pass soon
    const leavingSoonGamePass = [
      { title: "Hollow Knight", days: 7 },
      { title: "Celeste", days: 14 },
      { title: "Dishonored 2", days: 3 },
      { title: "Prey", days: 10 },
      { title: "Psychonauts 2", days: 21 },
      { title: "Pentiment", days: 25 },
    ];

    // Games coming soon to PS+
    const comingSoonPSPlus = [
      { title: "Final Fantasy VII Rebirth", days: 10 },
      { title: "Gran Turismo 7", days: 18 },
      { title: "Stellar Blade", days: 6 },
      { title: "Silent Hill 2", days: 22 },
      { title: "Rise of the Ronin", days: 30 },
    ];

    // Games leaving PS+ soon
    const leavingSoonPSPlus = [
      { title: "Stray", days: 5 },
      { title: "Death Stranding", days: 12 },
      { title: "Returnal", days: 8 },
      { title: "Spider-Man: Miles Morales", days: 18 },
      { title: "Ratchet & Clank: Rift Apart", days: 24 },
    ];

    // Games coming soon to EA Play
    const comingSoonEAPlay = [
      { title: "EA Sports FC 25", days: 4 },
      { title: "Dragon Age: The Veilguard", days: 14 },
      { title: "College Football 25", days: 20 },
    ];

    // Games leaving EA Play soon
    const leavingSoonEAPlay = [
      { title: "FIFA 23", days: 6 },
      { title: "Need for Speed Unbound", days: 16 },
      { title: "Dead Space", days: 28 },
    ];

    // Games coming soon to Ubisoft+
    const comingSoonUbisoft = [
      { title: "Assassin's Creed Shadows", days: 9 },
      { title: "Star Wars Outlaws", days: 3 },
      { title: "Prince of Persia: The Lost Crown", days: 17 },
    ];

    // Games leaving Ubisoft+ soon
    const leavingSoonUbisoft = [
      { title: "Far Cry 6", days: 11 },
      { title: "Watch Dogs: Legion", days: 19 },
      { title: "Immortals Fenyx Rising", days: 26 },
    ];

    let synced = 0;
    let errors = 0;

    // Process coming soon - Game Pass
    for (const { title, days } of comingSoonGamePass) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: gamepass._id,
            tier_slug: "standard",
            platform: "console",
            status: "coming_soon" as const,
            available_date: now + days * 24 * 60 * 60 * 1000,
          });
          synced++;
          console.log(`[Coming Soon - Game Pass] ${title} in ${days} days`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    // Process leaving soon - Game Pass
    for (const { title, days } of leavingSoonGamePass) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          // Update existing entries to leaving_soon status
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: gamepass._id,
            tier_slug: "standard",
            platform: "pc",
            status: "leaving_soon" as const,
            leaving_date: now + days * 24 * 60 * 60 * 1000,
          });
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: gamepass._id,
            tier_slug: "standard",
            platform: "console",
            status: "leaving_soon" as const,
            leaving_date: now + days * 24 * 60 * 60 * 1000,
          });
          synced++;
          console.log(`[Leaving Soon - Game Pass] ${title} in ${days} days`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    // Process coming soon - PS+
    for (const { title, days } of comingSoonPSPlus) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: psplus._id,
            tier_slug: "extra",
            platform: "console",
            status: "coming_soon" as const,
            available_date: now + days * 24 * 60 * 60 * 1000,
          });
          synced++;
          console.log(`[Coming Soon - PS+] ${title} in ${days} days`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    // Process leaving soon - PS+
    for (const { title, days } of leavingSoonPSPlus) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: psplus._id,
            tier_slug: "extra",
            platform: "console",
            status: "leaving_soon" as const,
            leaving_date: now + days * 24 * 60 * 60 * 1000,
          });
          synced++;
          console.log(`[Leaving Soon - PS+] ${title} in ${days} days`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    // Process coming soon - EA Play
    for (const { title, days } of comingSoonEAPlay) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: eaplay._id,
            tier_slug: "standard",
            platform: "pc",
            status: "coming_soon" as const,
            available_date: now + days * 24 * 60 * 60 * 1000,
          });
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: eaplay._id,
            tier_slug: "standard",
            platform: "console",
            status: "coming_soon" as const,
            available_date: now + days * 24 * 60 * 60 * 1000,
          });
          synced++;
          console.log(`[Coming Soon - EA Play] ${title} in ${days} days`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    // Process leaving soon - EA Play
    for (const { title, days } of leavingSoonEAPlay) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: eaplay._id,
            tier_slug: "standard",
            platform: "pc",
            status: "leaving_soon" as const,
            leaving_date: now + days * 24 * 60 * 60 * 1000,
          });
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: eaplay._id,
            tier_slug: "standard",
            platform: "console",
            status: "leaving_soon" as const,
            leaving_date: now + days * 24 * 60 * 60 * 1000,
          });
          synced++;
          console.log(`[Leaving Soon - EA Play] ${title} in ${days} days`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    // Process coming soon - Ubisoft+
    for (const { title, days } of comingSoonUbisoft) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: ubisoftplus._id,
            tier_slug: "classics",
            platform: "pc",
            status: "coming_soon" as const,
            available_date: now + days * 24 * 60 * 60 * 1000,
          });
          synced++;
          console.log(`[Coming Soon - Ubisoft+] ${title} in ${days} days`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    // Process leaving soon - Ubisoft+
    for (const { title, days } of leavingSoonUbisoft) {
      try {
        const gameId = await ctx.runAction(api.igdb.searchAndImport, { title });
        if (gameId) {
          await ctx.runMutation(api.catalog.upsertEntry, {
            game_id: gameId,
            subscription_id: ubisoftplus._id,
            tier_slug: "classics",
            platform: "pc",
            status: "leaving_soon" as const,
            leaving_date: now + days * 24 * 60 * 60 * 1000,
          });
          synced++;
          console.log(`[Leaving Soon - Ubisoft+] ${title} in ${days} days`);
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error(`Failed: ${title}`, e);
      }
    }

    return { synced, errors };
  },
});
