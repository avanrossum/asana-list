// ══════════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// Pure functions for formatting dates, times, and display strings.
// Extracted from components for testability.
// ══════════════════════════════════════════════════════════════════════════════

import type { AsanaUser, AsanaTask } from './types';

interface DueDateResult {
  text: string;
  isOverdue: boolean;
}

interface CommentSegment {
  type: 'text' | 'profile' | 'url';
  value: string;
  userName?: string | null;
  url?: string;
}

/**
 * Format a due date as a human-readable string.
 * Returns "Today", "Tomorrow", or a short date (e.g. "Jan 15").
 */
export function formatDueDate(dueOn: string | null | undefined, now: Date = new Date()): DueDateResult | null {
  if (!dueOn) return null;

  // Date-only strings (YYYY-MM-DD) are parsed as UTC by the Date constructor,
  // but we need local-date comparison. Parse manually to avoid timezone shift.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dueOn);
  const d = dateOnly
    ? new Date(parseInt(dueOn.slice(0, 4)), parseInt(dueOn.slice(5, 7)) - 1, parseInt(dueOn.slice(8, 10)))
    : new Date(dueOn);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const isOverdue = d < today;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let text: string;
  if (d.getTime() === today.getTime()) {
    text = 'Today';
  } else if (d.getTime() === tomorrow.getTime()) {
    text = 'Tomorrow';
  } else {
    text = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return { text, isOverdue };
}

/**
 * Format a timestamp as a relative time string.
 * Returns "just now", "5m ago", "2h ago", "3d ago", or a short date.
 */
export function formatRelativeTime(isoTimestamp: string | null | undefined, now: Date = new Date()): string {
  if (!isoTimestamp) return '';

  const date = new Date(isoTimestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Parse comment text to identify Asana profile links and general URLs.
 * Returns an array of segments: plain text strings and link descriptors.
 *
 * This is the pure logic layer — the React component wraps these segments
 * in <a> tags and click handlers.
 */
export function parseCommentSegments(text: string | null | undefined, users: AsanaUser[]): CommentSegment[] | null {
  if (!text) return null;

  // Build user GID → name lookup
  const userMap: Record<string, string> = {};
  if (users && users.length > 0) {
    for (const u of users) {
      userMap[u.gid] = u.name;
    }
  }

  // Replace profile links with placeholder tokens
  const profileRegex = /https:\/\/app\.asana\.com\/\d+\/\d+\/profile\/(\d+)/g;
  const profileMatches: { token: string; userGid: string; url: string }[] = [];
  const processed = text.replace(profileRegex, (match, userGid: string) => {
    const token = `__PROFILE_${profileMatches.length}__`;
    profileMatches.push({ token, userGid, url: match });
    return token;
  });

  // Build split pattern for tokens and remaining URLs
  const allTokens = profileMatches.map(p => p.token);
  const urlRegex = /(https?:\/\/[^\s<]+)/;
  const tokenPattern = allTokens.length > 0
    ? new RegExp(`(${allTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|https?://[^\\s<]+)`)
    : urlRegex;

  const parts = processed.split(tokenPattern);
  const segments: CommentSegment[] = [];

  for (const part of parts) {
    if (!part) continue;

    const profileMatch = profileMatches.find(p => p.token === part);
    if (profileMatch) {
      segments.push({
        type: 'profile',
        value: userMap[profileMatch.userGid] || 'Profile',
        userName: userMap[profileMatch.userGid] || null,
        url: profileMatch.url
      });
    } else if (/^https?:\/\//.test(part)) {
      segments.push({
        type: 'url',
        value: part.length > 50 ? part.substring(0, 50) + '...' : part,
        url: part
      });
    } else {
      segments.push({ type: 'text', value: part });
    }
  }

  return segments;
}

/**
 * Replace @mentions in comment text with Asana profile link URLs.
 * Converts "@Display Name" patterns into "https://app.asana.com/0/0/profile/{userGid}".
 * Unknown @mentions are left as-is.
 */
export function replaceMentionsWithLinks(text: string, users: AsanaUser[]): string {
  if (!text || users.length === 0) return text;

  // Build name → user map (case-insensitive), sorted by name length descending for greedy matching
  const sortedUsers = [...users].sort((a, b) => b.name.length - a.name.length);

  let result = text;
  for (const user of sortedUsers) {
    // Escape regex special characters in user name
    const escaped = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`@${escaped}(?![\\w])`, 'gi');
    result = result.replace(pattern, `https://app.asana.com/0/0/profile/${user.gid}`);
  }

  return result;
}

// ── Project Membership Helpers ──────────────────────────────────────────────

export interface ProjectMembership {
  projectGid: string;
  projectName: string;
  sectionGid?: string;
  sectionName?: string;
}

/** Build enriched project list by joining task.projects with task.memberships. */
export function buildProjectMemberships(task: AsanaTask): ProjectMembership[] {
  const sectionMap = new Map<string, { gid?: string; name?: string }>();
  if (task.memberships) {
    for (const m of task.memberships) {
      if (m.project?.gid && m.section) {
        sectionMap.set(m.project.gid, { gid: m.section.gid, name: m.section.name });
      }
    }
  }
  return (task.projects || []).map(p => {
    const sec = sectionMap.get(p.gid);
    return {
      projectGid: p.gid,
      projectName: p.name,
      sectionGid: sec?.gid,
      sectionName: sec?.name,
    };
  });
}
