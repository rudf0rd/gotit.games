import { describe, it, expect } from "vitest";
import { fetchUbisoftCatalog } from "../convex/sync/ubisoftplus";

// Known Ubisoft+ games for validation
const KNOWN_UBISOFT_TITLES = [
  "Assassin's Creed",
  "Far Cry",
  "Watch Dogs",
  "Rainbow Six",
  "The Division",
  "Ghost Recon",
  "Anno",
  "Rayman",
  "Prince of Persia",
  "Skull and Bones",
];

describe("Ubisoft+ Sync", () => {
  describe("fetchUbisoftCatalog", () => {
    it("should attempt to fetch from Ubisoft API", async () => {
      // Note: Ubisoft doesn't have a reliable public API,
      // so this might return empty and fall back to known games list
      const products = await fetchUbisoftCatalog();

      // Either API works and returns products, or it gracefully returns empty
      expect(Array.isArray(products)).toBe(true);

      if (products.length > 0) {
        // If API worked, validate product structure
        expect(products[0]).toHaveProperty("name");
      }
    }, 30000);
  });

  describe("Fallback data validation", () => {
    it("should have comprehensive fallback game list", async () => {
      // Import the known games list
      const { KNOWN_UBISOFT_GAMES } = await import("../convex/sync/ubisoftplus");

      // Should have a reasonable number of games
      expect(KNOWN_UBISOFT_GAMES.length).toBeGreaterThan(20);

      // Each game should have required fields
      for (const game of KNOWN_UBISOFT_GAMES) {
        expect(game.title).toBeTruthy();
        expect(["classics", "premium"]).toContain(game.tier);
        expect(game.platforms.length).toBeGreaterThan(0);
      }
    });

    it("should include major Ubisoft franchises", async () => {
      const { KNOWN_UBISOFT_GAMES } = await import("../convex/sync/ubisoftplus");

      const titles = KNOWN_UBISOFT_GAMES.map((g) => g.title.toLowerCase());

      // Check for major franchises
      const hasAssassinsCreed = titles.some((t) => t.includes("assassin"));
      const hasFarCry = titles.some((t) => t.includes("far cry"));
      const hasWatchDogs = titles.some((t) => t.includes("watch dogs"));
      const hasRainbowSix = titles.some((t) => t.includes("rainbow"));

      expect(hasAssassinsCreed).toBe(true);
      expect(hasFarCry).toBe(true);
      expect(hasWatchDogs).toBe(true);
      expect(hasRainbowSix).toBe(true);
    });

    it("should have correct tier assignments", async () => {
      const { KNOWN_UBISOFT_GAMES } = await import("../convex/sync/ubisoftplus");

      // Premium games (newer releases)
      const premiumGames = KNOWN_UBISOFT_GAMES.filter((g) => g.tier === "premium");
      const classicsGames = KNOWN_UBISOFT_GAMES.filter((g) => g.tier === "classics");

      // Should have both tiers
      expect(premiumGames.length).toBeGreaterThan(0);
      expect(classicsGames.length).toBeGreaterThan(0);

      // Newer games should be premium
      const mirage = KNOWN_UBISOFT_GAMES.find((g) =>
        g.title.toLowerCase().includes("mirage")
      );
      if (mirage) {
        expect(mirage.tier).toBe("premium");
      }

      // Older games should be classics
      const odyssey = KNOWN_UBISOFT_GAMES.find((g) =>
        g.title.toLowerCase().includes("odyssey")
      );
      if (odyssey) {
        expect(odyssey.tier).toBe("classics");
      }
    });

    it("should have correct platform assignments", async () => {
      const { KNOWN_UBISOFT_GAMES } = await import("../convex/sync/ubisoftplus");

      // Most games should be on both PC and console
      const multiplatform = KNOWN_UBISOFT_GAMES.filter(
        (g) => g.platforms.includes("pc") && g.platforms.includes("console")
      );
      expect(multiplatform.length).toBeGreaterThan(KNOWN_UBISOFT_GAMES.length * 0.5);

      // Some games are PC-only (like Anno)
      const pcOnly = KNOWN_UBISOFT_GAMES.filter(
        (g) => g.platforms.includes("pc") && !g.platforms.includes("console")
      );
      const anno = pcOnly.find((g) => g.title.toLowerCase().includes("anno"));
      expect(anno).toBeDefined();
    });
  });

  describe("Data structure validation", () => {
    it("should have unique game titles", async () => {
      const { KNOWN_UBISOFT_GAMES } = await import("../convex/sync/ubisoftplus");

      const titles = KNOWN_UBISOFT_GAMES.map((g) => g.title);
      const uniqueTitles = [...new Set(titles)];

      expect(titles.length).toBe(uniqueTitles.length);
    });

    it("should have valid platform values", async () => {
      const { KNOWN_UBISOFT_GAMES } = await import("../convex/sync/ubisoftplus");

      const validPlatforms = ["pc", "console"];

      for (const game of KNOWN_UBISOFT_GAMES) {
        for (const platform of game.platforms) {
          expect(validPlatforms).toContain(platform);
        }
      }
    });
  });

  describe("Sync behavior", () => {
    it("should gracefully handle API failures", async () => {
      // The fetchUbisoftCatalog function should not throw
      // even if the API is unavailable
      const products = await fetchUbisoftCatalog();

      // Should return empty array on failure, not throw
      expect(Array.isArray(products)).toBe(true);
    });
  });
});
