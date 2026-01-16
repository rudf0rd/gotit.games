import { describe, it, expect } from "vitest";
import {
  fetchGamePassCatalog,
  fetchProductDetails,
  extractGameData,
  SIGLS_COLLECTIONS,
} from "../convex/sync/gamepass";

describe("EA Play Sync", () => {
  describe("EA Play catalog from Game Pass API", () => {
    it("should fetch EA Play games from Microsoft", async () => {
      const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.EA_PLAY);

      expect(Array.isArray(productIds)).toBe(true);
      expect(productIds.length).toBeGreaterThan(20); // EA Play has 50+ games
    });

    it("should include known EA games", async () => {
      const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.EA_PLAY);
      const products = await fetchProductDetails(productIds.slice(0, 30));

      const titles = products
        .map((p) => extractGameData(p)?.title?.toLowerCase())
        .filter(Boolean);

      // Check for some well-known EA franchises
      const hasEaGame = titles.some(
        (title) =>
          title?.includes("fifa") ||
          title?.includes("madden") ||
          title?.includes("battlefield") ||
          title?.includes("need for speed") ||
          title?.includes("star wars") ||
          title?.includes("ea sports") ||
          title?.includes("mass effect") ||
          title?.includes("dragon age") ||
          title?.includes("dead space") ||
          title?.includes("skate")
      );

      expect(hasEaGame).toBe(true);
    }, 30000);
  });

  describe("EA Play data extraction", () => {
    it("should extract valid game data from EA products", async () => {
      const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.EA_PLAY);
      const products = await fetchProductDetails(productIds.slice(0, 10));

      let validCount = 0;
      for (const product of products) {
        const gameData = extractGameData(product);
        if (gameData) {
          expect(gameData.title).toBeTruthy();
          expect(gameData.ms_product_id).toBeTruthy();
          validCount++;
        }
      }

      // At least 80% should be valid
      expect(validCount / products.length).toBeGreaterThan(0.8);
    }, 30000);
  });

  describe("EA Play vs Game Pass overlap", () => {
    it("should identify games that are on both services", async () => {
      // Fetch both catalogs
      const gamePassIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.ALL_CONSOLE);
      const eaPlayIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.EA_PLAY);

      // Find overlap
      const gamePassSet = new Set(gamePassIds);
      const overlap = eaPlayIds.filter((id) => gamePassSet.has(id));

      // All EA Play games should be in Game Pass (since EA Play is bundled)
      expect(overlap.length).toBe(eaPlayIds.length);
    }, 30000);
  });
});
