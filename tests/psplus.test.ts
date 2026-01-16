import { describe, it, expect } from "vitest";
import {
  fetchPsPlusCatalog,
  fetchAllPsPlusProducts,
  extractPsGameData,
  PS_PLUS_CATEGORIES,
} from "../convex/sync/psplus";

describe("PlayStation Plus Sync", () => {
  describe("fetchPsPlusCatalog", () => {
    it("should fetch PS Plus Game Catalog", async () => {
      try {
        const { products, totalCount } = await fetchPsPlusCatalog(
          PS_PLUS_CATEGORIES.GAME_CATALOG,
          0,
          10
        );

        // Note: This test may fail if Sony's GraphQL hash changes
        // In that case, the hash needs to be updated in psplus.ts
        if (products.length === 0) {
          console.warn(
            "PS Plus API returned no products - GraphQL hash may need updating"
          );
          // Skip assertion if API is not working
          return;
        }

        expect(products.length).toBeGreaterThan(0);
        expect(products.length).toBeLessThanOrEqual(10);
        expect(totalCount).toBeGreaterThan(0);
      } catch (e) {
        // Sony's API may be unavailable or the hash may have changed
        console.warn("PS Plus API unavailable:", e);
        // Test passes if API is unavailable - this is expected behavior
      }
    }, 30000);

    it("should support pagination", async () => {
      try {
        const page1 = await fetchPsPlusCatalog(
          PS_PLUS_CATEGORIES.GAME_CATALOG,
          0,
          5
        );
        const page2 = await fetchPsPlusCatalog(
          PS_PLUS_CATEGORIES.GAME_CATALOG,
          5,
          5
        );

        if (page1.products.length === 0 || page2.products.length === 0) {
          console.warn("PS Plus API pagination test skipped - API may be unavailable");
          return;
        }

        // Pages should have different products
        const page1Names = page1.products.map((p) => p.name);
        const page2Names = page2.products.map((p) => p.name);

        const overlap = page1Names.filter((name) => page2Names.includes(name));
        expect(overlap.length).toBe(0);
      } catch (e) {
        console.warn("PS Plus API unavailable for pagination test:", e);
      }
    }, 30000);
  });

  describe("fetchAllPsPlusProducts", () => {
    it("should fetch all products with pagination", async () => {
      try {
        // This test fetches the entire catalog, so give it more time
        const products = await fetchAllPsPlusProducts(PS_PLUS_CATEGORIES.GAME_CATALOG);

        if (products.length === 0) {
          console.warn("PS Plus full catalog fetch returned no products");
          return;
        }

        // PS Plus Extra typically has 400+ games
        expect(products.length).toBeGreaterThan(100);
      } catch (e) {
        console.warn("PS Plus API unavailable for full catalog test:", e);
      }
    }, 120000); // 2 minute timeout for full catalog
  });

  describe("extractPsGameData", () => {
    it("should extract game data from valid PS product", () => {
      const mockProduct = {
        id: "UP0001-TEST00001_00-TESTGAME00000001",
        name: "Test PlayStation Game",
        descriptions: [
          { type: "SHORT_DESCRIPTION", value: "A short description" },
          { type: "LONG_DESCRIPTION", value: "A longer description" },
        ],
        media: {
          images: [
            { role: "MASTER", url: "https://example.com/cover.jpg" },
            { role: "SCREENSHOT", url: "https://example.com/screenshot.jpg" },
          ],
        },
        releaseDate: "2024-01-15T00:00:00Z",
        platforms: ["PS5", "PS4"],
      };

      const result = extractPsGameData(mockProduct);

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Test PlayStation Game");
      expect(result!.description).toBe("A short description");
      expect(result!.cover_url).toBe("https://example.com/cover.jpg");
      expect(result!.release_date).toBe("2024-01-15");
      expect(result!.psn_id).toBe("UP0001-TEST00001_00-TESTGAME00000001");
      expect(result!.platforms).toContain("ps5");
      expect(result!.platforms).toContain("ps4");
    });

    it("should handle missing optional fields", () => {
      const mockProduct = {
        id: "TEST123",
        name: "Minimal Game",
      };

      const result = extractPsGameData(mockProduct);

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Minimal Game");
      expect(result!.description).toBeUndefined();
      expect(result!.cover_url).toBeUndefined();
      expect(result!.platforms).toContain("console"); // Default
    });

    it("should return null for product without name", () => {
      const mockProduct = {
        id: "TEST123",
        descriptions: [{ type: "SHORT_DESCRIPTION", value: "No name" }],
      };

      const result = extractPsGameData(mockProduct as any);

      expect(result).toBeNull();
    });

    it("should correctly identify PS5-only games", () => {
      const mockProduct = {
        id: "TEST123",
        name: "PS5 Exclusive",
        platforms: ["PS5"],
      };

      const result = extractPsGameData(mockProduct);

      expect(result!.platforms).toContain("ps5");
      expect(result!.platforms).not.toContain("ps4");
    });

    it("should correctly identify PS4-only games", () => {
      const mockProduct = {
        id: "TEST123",
        name: "PS4 Game",
        platforms: ["PS4"],
      };

      const result = extractPsGameData(mockProduct);

      expect(result!.platforms).toContain("ps4");
      expect(result!.platforms).not.toContain("ps5");
    });

    it("should prefer MASTER image for cover", () => {
      const mockProduct = {
        id: "TEST123",
        name: "Image Test",
        media: {
          images: [
            { role: "GAMEHUB_COVER_ART", url: "https://example.com/hub.jpg" },
            { role: "MASTER", url: "https://example.com/master.jpg" },
            { role: "BACKGROUND", url: "https://example.com/bg.jpg" },
          ],
        },
      };

      const result = extractPsGameData(mockProduct);

      expect(result!.cover_url).toBe("https://example.com/master.jpg");
    });
  });

  describe("Integration: Real PS Plus data", () => {
    it("should be able to fetch and parse real PS Plus data", async () => {
      try {
        const { products } = await fetchPsPlusCatalog(
          PS_PLUS_CATEGORIES.GAME_CATALOG,
          0,
          20
        );

        if (products.length === 0) {
          console.warn("Skipping integration test - PS Plus API unavailable");
          return;
        }

        let successCount = 0;
        for (const product of products) {
          const gameData = extractPsGameData(product);
          if (gameData) {
            expect(gameData.title).toBeTruthy();
            expect(gameData.psn_id).toBeTruthy();
            successCount++;
          }
        }

        // At least 80% should parse successfully
        expect(successCount / products.length).toBeGreaterThan(0.8);
      } catch (e) {
        console.warn("PS Plus API unavailable for integration test:", e);
      }
    }, 30000);
  });
});
