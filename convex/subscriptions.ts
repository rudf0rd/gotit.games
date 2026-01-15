import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Seed data for our supported subscription services
const SUBSCRIPTION_SEEDS = [
  {
    slug: "gamepass",
    name: "Xbox Game Pass",
    color: "#107C10",
    tiers: [
      { slug: "core", name: "Core", rank: 1 },
      { slug: "standard", name: "Standard", rank: 2 },
      { slug: "ultimate", name: "Ultimate", rank: 3 },
    ],
  },
  {
    slug: "psplus",
    name: "PlayStation Plus",
    color: "#003791",
    tiers: [
      { slug: "essential", name: "Essential", rank: 1 },
      { slug: "extra", name: "Extra", rank: 2 },
      { slug: "premium", name: "Premium", rank: 3 },
    ],
  },
  {
    slug: "eaplay",
    name: "EA Play",
    color: "#FF4747",
    tiers: [
      { slug: "standard", name: "Standard", rank: 1 },
      { slug: "pro", name: "Pro", rank: 2 },
    ],
  },
  {
    slug: "ubisoftplus",
    name: "Ubisoft+",
    color: "#0070FF",
    tiers: [
      { slug: "classics", name: "Classics", rank: 1 },
      { slug: "premium", name: "Premium", rank: 2 },
    ],
  },
];

// Seed all subscription services (run once)
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("subscriptions").first();
    if (existing) {
      return { status: "already_seeded", count: 0 };
    }

    let count = 0;
    for (const sub of SUBSCRIPTION_SEEDS) {
      await ctx.db.insert("subscriptions", sub);
      count++;
    }

    return { status: "seeded", count };
  },
});

// Get all subscription services
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("subscriptions").collect();
  },
});

// Get a subscription by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get user's subscriptions
export const getUserSubscriptions = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    const userSubs = await ctx.db
      .query("user_subscriptions")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    // Fetch full subscription details
    const results = await Promise.all(
      userSubs.map(async (us) => {
        const subscription = await ctx.db.get(us.subscription_id);
        return {
          ...us,
          subscription,
        };
      })
    );

    return results;
  },
});

// Add a subscription for a user
export const addUserSubscription = mutation({
  args: {
    user_id: v.string(),
    subscription_id: v.id("subscriptions"),
    tier_slug: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("user_subscriptions")
      .withIndex("by_user_subscription", (q) =>
        q.eq("user_id", args.user_id).eq("subscription_id", args.subscription_id)
      )
      .first();

    if (existing) {
      // Update tier if different
      if (existing.tier_slug !== args.tier_slug) {
        await ctx.db.patch(existing._id, { tier_slug: args.tier_slug });
      }
      return existing._id;
    }

    return await ctx.db.insert("user_subscriptions", args);
  },
});

// Remove a subscription for a user
export const removeUserSubscription = mutation({
  args: {
    user_id: v.string(),
    subscription_id: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_subscriptions")
      .withIndex("by_user_subscription", (q) =>
        q.eq("user_id", args.user_id).eq("subscription_id", args.subscription_id)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});
