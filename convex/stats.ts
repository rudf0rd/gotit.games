import { query } from "./_generated/server";

// Get site-wide stats
export const getSiteStats = query({
  args: {},
  handler: async (ctx) => {
    // Count total games
    const games = await ctx.db.query("games").collect();

    // Count total users
    const users = await ctx.db.query("users").collect();

    // Count catalog entries
    const entries = await ctx.db.query("catalog_entries").collect();

    return {
      gamesTracked: games.length,
      players: users.length,
      catalogEntries: entries.length,
    };
  },
});
