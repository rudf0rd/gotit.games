import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Canonical game data (from IGDB or RAWG)
  games: defineTable({
    // IGDB fields (primary)
    igdb_id: v.optional(v.number()),
    igdb_slug: v.optional(v.string()),
    // RAWG fields (legacy/fallback)
    rawg_id: v.optional(v.number()),
    rawg_slug: v.optional(v.string()),
    // Common fields
    title: v.string(),
    cover_url: v.optional(v.string()),
    release_date: v.optional(v.string()),
    platforms: v.array(v.string()), // ["pc", "playstation", "xbox", "switch"]
    description: v.optional(v.string()),
    updated_at: v.number(),
  })
    .index("by_igdb_id", ["igdb_id"])
    .index("by_igdb_slug", ["igdb_slug"])
    .index("by_rawg_id", ["rawg_id"])
    .index("by_rawg_slug", ["rawg_slug"])
    .searchIndex("search_title", {
      searchField: "title",
    }),

  // Subscription services we track
  subscriptions: defineTable({
    slug: v.string(), // "gamepass", "psplus", "eaplay", "ubisoftplus"
    name: v.string(),
    tiers: v.array(
      v.object({
        slug: v.string(), // "ultimate", "extra", "pro"
        name: v.string(),
        rank: v.number(), // higher rank = more access (for filtering)
      })
    ),
    logo_url: v.optional(v.string()),
    color: v.string(), // brand color for UI
  }).index("by_slug", ["slug"]),

  // Which games are on which services
  catalog_entries: defineTable({
    game_id: v.id("games"),
    subscription_id: v.id("subscriptions"),
    tier_slug: v.string(), // minimum tier required
    platform: v.string(), // "pc", "console", "cloud"
    status: v.union(
      v.literal("available"),
      v.literal("coming_soon"),
      v.literal("leaving_soon")
    ),
    available_date: v.optional(v.number()),
    leaving_date: v.optional(v.number()),
    service_game_id: v.optional(v.string()), // xbox_id, psn_id, etc.
    last_verified_at: v.number(),
  })
    .index("by_game", ["game_id"])
    .index("by_subscription", ["subscription_id"])
    .index("by_subscription_status", ["subscription_id", "status"])
    .index("by_status", ["status"]),

  // What subscriptions a user has
  user_subscriptions: defineTable({
    user_id: v.string(), // Clerk user ID
    subscription_id: v.id("subscriptions"),
    tier_slug: v.string(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_subscription", ["user_id", "subscription_id"]),

  // Users synced from Clerk
  users: defineTable({
    clerk_id: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_clerk_id", ["clerk_id"]),
});
