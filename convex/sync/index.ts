// Re-export all sync actions for convenience
export { syncGamePass, getSyncStatus as getGamePassStatus } from "./gamepass";
export { syncEaPlay, getSyncStatus as getEaPlayStatus } from "./eaplay";
export { syncPsPlus, getSyncStatus as getPsPlusStatus } from "./psplus";
export { syncUbisoftPlus, getSyncStatus as getUbisoftPlusStatus, addGame as addUbisoftGame } from "./ubisoftplus";

// Re-export types
export type { SyncResult } from "./gamepass";
