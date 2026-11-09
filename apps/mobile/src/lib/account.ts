import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { supabase } from './supabase';
import { database } from './db';
import { clearMemberships } from './membershipStore';
import type { DeletionPlan } from './accountWords';

/**
 * Deleting an account, and the account's own name — the phone's half.
 *
 * The server does the deleting (`delete_my_account`, 0024) and keeps the name
 * (`set_my_name`, 0029). This file asks it, and then makes the phone match:
 * after a delete the phone holds nothing of the person who held it.
 * `design/handoff-account-and-names/` is the board, S1–S8 and N1–N5.
 */

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** What deleting would do — read before the hold, changes nothing. */
export async function readDeletionPlan(): Promise<DeletionPlan> {
  const plan = await rpc<DeletionPlan | null>('account_deletion_plan');
  if (plan === null) throw new Error('Not signed in.');
  return plan;
}

/**
 * Do it. Returns the plan carried out, with `deleted: true` — or, with
 * `refused: 'game_running'`, the night that stopped it, and nothing deleted.
 */
export async function deleteMyAccount(): Promise<DeletionPlan> {
  return rpc<DeletionPlan>('delete_my_account');
}

/**
 * THE PHONE STARTS OVER (S7). The account is already gone from the server
 * when this runs; what is left is this phone's copy of it.
 *
 *   · the session — signed out locally: the server has nothing to sign out of
 *   · every row of the one SQLite file — nights, groups, the outbox. Emptied
 *     rather than deleted, because the stores hold an open connection to it
 *   · every key in AsyncStorage — the claimed seat, the remembered views
 *   · then a reload, so no store keeps the old state in memory
 *
 * A phone opened afterwards is a fresh install, sample night and all (A7 in
 * `app-store-launch.md` is the separate question of what a fresh install shows).
 */
export async function forgetThisPhone(): Promise<void> {
  clearMemberships();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // The user no longer exists; a refusal here changes nothing on the phone.
  }

  const db = await database('forget', async () => {});
  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
  );
  for (const { name } of tables) {
    await db.runAsync(`DELETE FROM "${name.replace(/"/g, '""')}"`);
  }

  try {
    await AsyncStorage.clear();
  } catch {
    // Nothing kept there is worth failing a deletion over.
  }

  if (Platform.OS === 'web') {
    window.location.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    // Development builds without updates: the caller routes home instead.
  }
}

/** The account's own name, or null — N5, and whether to ask for it (N1). */
export async function myName(): Promise<string | null> {
  return rpc<string | null>('my_name');
}

/** Set it. Returns the name as the server stored it — trimmed, spaces folded. */
export async function setMyName(name: string): Promise<string> {
  return rpc<string>('set_my_name', { name });
}

/** R1: the player renames their own seat in a group. */
export async function renameMySeat(playerId: string, name: string): Promise<string> {
  return rpc<string>('rename_my_seat', { target_player_id: playerId, name });
}

/** R3: the admin puts the name they gave a seat back on it. */
export async function useAdminName(playerId: string): Promise<string> {
  return rpc<string>('use_admin_name', { target_player_id: playerId });
}

/**
 * The server's refusals, in the board's words (N3). The server says the same
 * thing in its own register; this is what a person reads.
 */
export function nameRefusal(message: string): string {
  if (/cannot be empty/i.test(message)) return 'A name can’t be empty.';
  if (/at most 40/i.test(message)) return 'Keep it under 40 characters.';
  const taken = /already called (.+)\.$/i.exec(message);
  if (taken !== null) return `Somebody in this group is already called ${taken[1]}.`;
  return 'There was no answer from the server. Nothing was changed.';
}
