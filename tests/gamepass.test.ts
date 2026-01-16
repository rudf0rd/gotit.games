import { describe, it, expect, beforeAll } from "vitest";
import {
  fetchGamePassCatalog,
  fetchProductDetails,
  extractGameData,
  extractPlatforms,
  SIGLS_COLLECTIONS,
} from "../convex/sync/gamepass";

describe("Game Pass Sync", () => {
  describe("fetchGamePassCatalog", () => {
    it("should fetch console games catalog", async () => {
      const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.ALL_CONSOLE);

      expect(Array.isArray(productIds)).toBe(true);
      expect(productIds.length).toBeGreaterThan(100); // Game Pass has 500+ games
      expect(productIds[0]).toMatch(/^[A-Z0-9]+$/); // Product IDs are alphanumeric
    });

    it("should fetch PC games catalog", async () => {
      const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.PC_GAMES);

      expect(Array.isArray(productIds)).toBe(true);
      expect(productIds.length).toBeGreaterThan(50);
    });

    it("should fetch EA Play catalog", async () => {
      const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.EA_PLAY);

      expect(Array.isArray(productIds)).toBe(true);
      expect(productIds.length).toBeGreaterThan(20); // EA Play has 50+ games
    });

    it("should support different markets", async () => {
      const usProducts = await fetchGamePassCatalog(
        SIGLS_COLLECTIONS.ALL_CONSOLE,
        "US",
        "en-us"
      );
      const ukProducts = await fetchGamePassCatalog(
        SIGLS_COLLECTIONS.ALL_CONSOLE,
        "GB",
        "en-gb"
      );

      // Both markets should return results
      expect(usProducts.length).toBeGreaterThan(0);
      expect(ukProducts.length).toBeGreaterThan(0);
    });
  });

  describe("fetchProductDetails", () => {
    let sampleProductIds: string[];

    beforeAll(async () => {
      // Get some real product IDs to test with
      const allIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.ALL_CONSOLE);
      sampleProductIds = allIds.slice(0, 5);
    });

    it("should fetch product details for valid IDs", async () => {
      const products = await fetchProductDetails(sampleProductIds);

      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty("ProductId");
      expect(products[0]).toHaveProperty("LocalizedProperties");
    });

    it("should handle empty product ID array", async () => {
      const products = await fetchProductDetails([]);
      expect(products).toEqual([]);
    });

    it("should batch requests for large arrays", async () => {
      // Get 30 product IDs (more than batch size of 20)
      const allIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.ALL_CONSOLE);
      const thirtyIds = allIds.slice(0, 30);

      const products = await fetchProductDetails(thirtyIds);

      // Should get close to 30 products (some might fail)
      expect(products.length).toBeGreaterThan(20);
    });
  });

  describe("extractGameData", () => {
    it("should extract game data from valid product", () => {
      const mockProduct = {
        ProductId: "TEST123",
        LocalizedProperties: [
          {
            ProductTitle: "Test Game",
            ShortDescription: "A test game",
            Images: [
              { ImagePurpose: "BoxArt", Uri: "//example.com/boxart.jpg" },
            ],
          },
        ],
        MarketProperties: [
          {
            OriginalReleaseDate: "2024-01-15T00:00:00Z",
          },
        ],
      };

      const result = extractGameData(mockProduct);

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Test Game");
      expect(result!.description).toBe("A test game");
      expect(result!.cover_url).toBe("https://example.com/boxart.jpg");
      expect(result!.release_date).toBe("2024-01-15");
      expect(result!.ms_product_id).toBe("TEST123");
    });

    it("should handle missing optional fields", () => {
      const mockProduct = {
        ProductId: "TEST456",
        LocalizedProperties: [
          {
            ProductTitle: "Minimal Game",
          },
        ],
      };

      const result = extractGameData(mockProduct);

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Minimal Game");
      expect(result!.description).toBeUndefined();
      expect(result!.cover_url).toBeUndefined();
      expect(result!.release_date).toBeUndefined();
    });

    it("should return null for invalid product", () => {
      const mockProduct = {
        ProductId: "INVALID",
        LocalizedProperties: [],
      };

      const result = extractGameData(mockProduct);

      expect(result).toBeNull();
    });

    it("should prefer BoxArt over other image types", () => {
      const mockProduct = {
        ProductId: "TEST789",
        LocalizedProperties: [
          {
            ProductTitle: "Image Test",
            Images: [
              { ImagePurpose: "Logo", Uri: "//example.com/logo.jpg" },
              { ImagePurpose: "BoxArt", Uri: "//example.com/boxart.jpg" },
              { ImagePurpose: "Screenshot", Uri: "//example.com/screenshot.jpg" },
            ],
          },
        ],
      };

      const result = extractGameData(mockProduct);

      expect(result!.cover_url).toBe("https://example.com/boxart.jpg");
    });
  });

  describe("extractPlatforms", () => {
    it("should detect Xbox platform", () => {
      const mockProduct = {
        ProductId: "TEST",
        LocalizedProperties: [{ ProductTitle: "Test" }],
        Properties: {
          Category: "Games",
          Categories: ["Xbox One Games"],
        },
      };

      const platforms = extractPlatforms(mockProduct);

      expect(platforms).toContain("console");
    });

    it("should detect PC platform", () => {
      const mockProduct = {
        ProductId: "TEST",
        LocalizedProperties: [{ ProductTitle: "Test" }],
        Properties: {
          Categories: ["PC Games", "Windows"],
        },
      };

      const platforms = extractPlatforms(mockProduct);

      expect(platforms).toContain("pc");
    });

    it("should detect both platforms", () => {
      const mockProduct = {
        ProductId: "TEST",
        LocalizedProperties: [{ ProductTitle: "Test" }],
        Properties: {
          Category: "Games",
          Categories: ["Xbox Games", "PC Games"],
        },
      };

      const platforms = extractPlatforms(mockProduct);

      expect(platforms).toContain("console");
      expect(platforms).toContain("pc");
    });

    it("should default to both platforms when unknown", () => {
      const mockProduct = {
        ProductId: "TEST",
        LocalizedProperties: [{ ProductTitle: "Test" }],
        Properties: {},
      };

      const platforms = extractPlatforms(mockProduct);

      expect(platforms).toContain("console");
      expect(platforms).toContain("pc");
    });
  });

  describe("Integration: Full catalog sync", () => {
    it("should be able to fetch and parse real Game Pass data", async () => {
      // Fetch a small sample of real data
      const productIds = await fetchGamePassCatalog(SIGLS_COLLECTIONS.ALL_CONSOLE);
      const sampleIds = productIds.slice(0, 10);
      const products = await fetchProductDetails(sampleIds);

      // Parse each product
      let successCount = 0;
      for (const product of products) {
        const gameData = extractGameData(product);
        if (gameData) {
          expect(gameData.title).toBeTruthy();
          expect(gameData.ms_product_id).toBeTruthy();
          successCount++;
        }
      }

      // At least 80% should parse successfully
      expect(successCount / products.length).toBeGreaterThan(0.8);
    }, 30000); // 30 second timeout for API calls
  });
});
