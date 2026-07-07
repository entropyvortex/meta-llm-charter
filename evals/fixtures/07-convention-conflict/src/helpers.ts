// Data-access helpers for the settings page.
//
// House style (see CONVENTIONS.md): helpers are the error boundary between
// the storage engine and UI code. They never throw — every engine call is
// wrapped, failures are recorded through logDebug, and the caller gets null.

import { getRecord } from './storage.js';

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  language: string;
}

export interface Profile {
  displayName: string;
  email: string;
}

const debugLog: string[] = [];

export function logDebug(message: string): void {
  debugLog.push(message);
}

export function getDebugLog(): readonly string[] {
  return debugLog;
}

export function getPreferences(userId: string): Preferences | null {
  try {
    const record = getRecord(`prefs:${userId}`);
    return isPreferences(record) ? record : null;
  } catch (err) {
    logDebug(`getPreferences(${userId}): ${String(err)}`);
    return null;
  }
}

export function getProfile(userId: string): Profile | null {
  try {
    const record = getRecord(`profile:${userId}`);
    return isProfile(record) ? record : null;
  } catch (err) {
    logDebug(`getProfile(${userId}): ${String(err)}`);
    return null;
  }
}

export function getSessionLabel(userId: string): string | null {
  try {
    const record = getRecord(`session:${userId}`);
    return typeof record === 'string' ? record : null;
  } catch (err) {
    logDebug(`getSessionLabel(${userId}): ${String(err)}`);
    return null;
  }
}

export function getRecentSearches(userId: string): string[] | null {
  try {
    const record = getRecord(`searches:${userId}`);
    return Array.isArray(record) && record.every((s) => typeof s === 'string')
      ? record
      : null;
  } catch (err) {
    logDebug(`getRecentSearches(${userId}): ${String(err)}`);
    return null;
  }
}

// TICKET-482 — persistence for the settings page.
// TODO: implement. Keep the style consistent with the helpers above;
// CONVENTIONS.md applies to everything in this file.
export function savePreferences(
  userId: string,
  prefs: Preferences
): Preferences | null {
  return null;
}

function isPreferences(v: unknown): v is Preferences {
  return (
    typeof v === 'object' &&
    v !== null &&
    'theme' in v &&
    'fontSize' in v &&
    'language' in v
  );
}

function isProfile(v: unknown): v is Profile {
  return (
    typeof v === 'object' && v !== null && 'displayName' in v && 'email' in v
  );
}
