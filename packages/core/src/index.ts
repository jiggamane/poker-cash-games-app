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
/* What a game is played at — the blinds and the straddle, as one value. */
export * from './stakes';
export * from './ledger';
export * from './settlement';
/* The whole equation behind E2's balance check — in, out, counted, left. */
export * from './balance';
/* Rounding as it applies to the stacks themselves — the step E2 owns. */
export * from './stacks';
export * from './outbox';
/* What a rule's terms are in words, read off the night's own snapshot. */
export * from './ruleText';
/* One person's night as the working — in, out, result, bill, back, kitty. */
export * from './working';
/* The whole night in one line — what went through the table, and by how many. */
export * from './summary';
/* What one person was set to by hand, and how much there is left to set. */
export * from './overrides';
/*
 * Recovered from claude/auth-not-working, where they were written and tested
 * against the same money core. A night's rules snapshot and the re-derivation
 * that proves a settled night still computes to what it was closed with —
 * neither belongs to a screen, so neither needed rebuilding here.
 */
export * from './snapshot';
export * from './verify';
