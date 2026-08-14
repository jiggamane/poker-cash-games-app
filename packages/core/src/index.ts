/**
 * @poker-club/core
 *
 * Pure money logic, imported by both the Expo app and the Supabase edge
 * functions. Nothing in here may touch the network, the filesystem, the clock,
 * or any platform API — that is what lets the same code run in both places and
 * makes the settlement reproducible.
 */

// No file extensions in these imports: Metro (the React Native bundler) resolves
// './money' to money.ts, but does not resolve './money.js' to it.
export * from './money';
export * from './types';
export * from './ledger';
export * from './settlement';
export * from './outbox';
/*
 * Recovered from claude/auth-not-working, where they were written and tested
 * against the same money core. A night's rules snapshot and the re-derivation
 * that proves a settled night still computes to what it was closed with —
 * neither belongs to a screen, so neither needed rebuilding here.
 */
export * from './snapshot';
export * from './verify';
