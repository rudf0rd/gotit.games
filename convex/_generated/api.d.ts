/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog from "../catalog.js";
import type * as crons from "../crons.js";
import type * as games from "../games.js";
import type * as igdb from "../igdb.js";
import type * as rawg from "../rawg.js";
import type * as seed from "../seed.js";
import type * as stats from "../stats.js";
import type * as subscriptions from "../subscriptions.js";
import type * as sync_eaplay from "../sync/eaplay.js";
import type * as sync_gamepass from "../sync/gamepass.js";
import type * as sync_index from "../sync/index.js";
import type * as sync_psplus from "../sync/psplus.js";
import type * as sync_ubisoftplus from "../sync/ubisoftplus.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalog: typeof catalog;
  crons: typeof crons;
  games: typeof games;
  igdb: typeof igdb;
  rawg: typeof rawg;
  seed: typeof seed;
  stats: typeof stats;
  subscriptions: typeof subscriptions;
  "sync/eaplay": typeof sync_eaplay;
  "sync/gamepass": typeof sync_gamepass;
  "sync/index": typeof sync_index;
  "sync/psplus": typeof sync_psplus;
  "sync/ubisoftplus": typeof sync_ubisoftplus;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
