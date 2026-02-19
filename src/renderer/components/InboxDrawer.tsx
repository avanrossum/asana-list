import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { ICON_PATHS } from '../icons';
import { formatRelativeTime } from '../../shared/formatters';
import type { InboxNotification } from '../../shared/types';

// ── Props ───────────────────────────────────────────────────────

interface InboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slideDirection: 'left' | 'right';
  currentUserId: string | null;
}

type ArchiveAllState = 'idle' | 'confirming';

// ── Helpers ─────────────────────────────────────────────────────

/** Known Asana story resource_subtype → human-readable label */
const SUBTYPE_LABELS: Record<string, string> = {
  comment_added: 'Comment',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  added_to_project: 'Added to Project',
  removed_from_project: 'Removed from Project',
  due_date_changed: 'Due Date Changed',
  start_date_changed: 'Start Date Changed',
  section_changed: 'Moved',
  attachment_added: 'Attachment',
  added_to_tag: 'Tagged',
  removed_from_tag: 'Untagged',
  name_changed: 'Renamed',
  notes_changed: 'Description Updated',
  completed: 'Completed',
  incompleted: 'Reopened',
  marked_complete: 'Completed',
  marked_incomplete: 'Reopened',
  liked: 'Liked',
  enum_custom_field_changed: 'Field Changed',
  number_custom_field_changed: 'Field Changed',
  text_custom_field_changed: 'Field Changed',
  multi_enum_custom_field_changed: 'Field Changed',
  date_custom_field_changed: 'Field Changed',
  people_custom_field_changed: 'Field Changed',
  follower_added: 'Follower Added',
  follower_removed: 'Follower Removed',
  dependency_added: 'Dependency Added',
  dependency_removed: 'Dependency Removed',
  dependent_added: 'Dependent Added',
  dependent_removed: 'Dependent Removed',
  duplicated_from: 'Duplicated',
  duplicated_to: 'Duplicated',
  approval_status_changed: 'Approval Changed',
  story_reaction_added: 'Reaction',
  story_reaction_removed: 'Reaction Removed',
};

/** Map Asana sticker_name → emoji for display */
const STICKER_EMOJI: Record<string, string> = {
  heart: '\u2764\uFE0F',
  celebrating_people: '\uD83C\uDF89',
  dancing_unicorn: '\uD83E\uDD84',
  determined_climbers: '\uD83E\uDDD7',
  green_checkmark: '\u2705',
  party_popper: '\uD83C\uDF8A',
  people_dancing: '\uD83D\uDD7A',
  people_waving_flags: '\uD83C\uDFC1',
  phoenix_spreading_love: '\uD83E\uDDA4',
  splashing_narwhal: '\uD83D\uDC33',
  trophy: '\uD83C\uDFC6',
  yeti_riding_unicorn: '\u2744\uFE0F',
  thumbs_up: '\uD83D\uDC4D',
  thumbsup: '\uD83D\uDC4D',
};

/** Convert an unknown subtype slug into a readable label (e.g. "follower_added" → "Follower Added") */
function formatUnknownSubtype(subtype: string): string {
  return subtype
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function subtypeLabel(subtype: string): string {
  return SUBTYPE_LABELS[subtype] ?? formatUnknownSubtype(subtype);
}

/** Format a sticker_name into a displayable string */
function formatSticker(stickerName: string): string {
  const emoji = STICKER_EMOJI[stickerName];
  const label = stickerName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return emoji ? `${emoji} ${label}` : label;
}

// ── Component ───────────────────────────────────────────────────

export default function InboxDrawer({ isOpen, onClose, slideDirection, currentUserId }: InboxDrawerProps) {
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [archivedGids, setArchivedGids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveAllState, setArchiveAllState] = useState<ArchiveAllState>('idle');
  const archiveAllTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch notifications when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      window.electronAPI.fetchInboxNotifications(),
      window.electronAPI.getArchivedInboxGids()
    ]).then(([result, archived]) => {
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      }
      setNotifications(result.notifications);
      setArchivedGids(new Set(archived));
    }).catch((err) => {
      if (cancelled) return;
      setError((err as Error).message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen]);

  // Escape key closes drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset archive-all state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setArchiveAllState('idle');
      if (archiveAllTimerRef.current) {
        clearTimeout(archiveAllTimerRef.current);
      }
    }
  }, [isOpen]);

  const handleArchive = useCallback((storyGid: string) => {
    // Optimistic local update
    setArchivedGids(prev => new Set(prev).add(storyGid));
    // Fire-and-forget IPC
    window.electronAPI.archiveInboxItem(storyGid);
  }, []);

  const handleOpenTask = useCallback((taskGid: string) => {
    const url = `https://app.asana.com/0/0/${taskGid}/f`;
    window.electronAPI.openUrl(url);
  }, []);

  const handleArchiveAll = useCallback(() => {
    if (archiveAllState === 'idle') {
      setArchiveAllState('confirming');
      archiveAllTimerRef.current = setTimeout(() => {
        setArchiveAllState('idle');
      }, 3000);
      return;
    }
    if (archiveAllState === 'confirming') {
      // Archive all visible (non-archived, non-self-authored) notifications
      const visibleGids = notifications
        .filter(n => !archivedGids.has(n.storyGid) && n.createdBy?.gid !== currentUserId)
        .map(n => n.storyGid);

      if (visibleGids.length > 0) {
        // Optimistic local update
        setArchivedGids(prev => {
          const next = new Set(prev);
          for (const gid of visibleGids) next.add(gid);
          return next;
        });
        // Fire-and-forget IPC
        window.electronAPI.archiveAllInboxItems(visibleGids);
      }
      setArchiveAllState('idle');
      if (archiveAllTimerRef.current) {
        clearTimeout(archiveAllTimerRef.current);
      }
    }
  }, [archiveAllState, notifications, archivedGids, currentUserId]);

  // Filter out archived and self-authored stories
  const visibleNotifications = notifications.filter(n =>
    !archivedGids.has(n.storyGid) && n.createdBy?.gid !== currentUserId
  );

  const archiveAllLabel = archiveAllState === 'confirming' ? 'Confirm?' : 'Archive All';

  return (
    <div className={`inbox-drawer ${isOpen ? 'open' : ''} slide-${slideDirection}`}>
      <div className="inbox-drawer-backdrop" onClick={onClose} />
      <div className="inbox-drawer-panel">
        <div className="inbox-drawer-header">
          <span className="inbox-drawer-title">Inbox</span>
          <div className="inbox-drawer-header-actions">
            {visibleNotifications.length > 0 && (
              <button
                className={`inbox-archive-all-btn ${archiveAllState === 'confirming' ? 'confirming' : ''}`}
                onClick={handleArchiveAll}
              >
                {archiveAllLabel}
              </button>
            )}
            <button className="inbox-drawer-close" onClick={onClose}>
              <Icon path={ICON_PATHS.close} size={14} />
            </button>
          </div>
        </div>
        <div className="inbox-drawer-content">
          {loading ? (
            <div className="inbox-drawer-empty">Loading...</div>
          ) : error ? (
            <div className="inbox-drawer-empty inbox-drawer-error">{error}</div>
          ) : visibleNotifications.length === 0 ? (
            <div className="inbox-drawer-empty">No new notifications</div>
          ) : (
            visibleNotifications.map(n => (
              <div key={n.storyGid} className="inbox-notification-item">
                <div className="inbox-notification-content">
                  <div className="inbox-notification-top">
                    <span className={`inbox-notification-label subtype-${n.resourceSubtype}`}>
                      {subtypeLabel(n.resourceSubtype)}
                    </span>
                    <span className="inbox-notification-time">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <button
                    className="inbox-notification-task"
                    onClick={() => handleOpenTask(n.taskGid)}
                    title="Open task in Asana"
                  >
                    {n.taskName}
                  </button>
                  {n.createdBy?.name && (
                    <span className="inbox-notification-author">{n.createdBy.name}</span>
                  )}
                  {n.stickerName && (
                    <span className="inbox-notification-sticker">
                      {formatSticker(n.stickerName)}
                    </span>
                  )}
                  {n.text && (
                    <span className="inbox-notification-text">
                      {n.text.length > 200 ? n.text.substring(0, 200) + '\u2026' : n.text}
                    </span>
                  )}
                </div>
                <button
                  className="inbox-notification-archive"
                  onClick={() => handleArchive(n.storyGid)}
                  title="Archive"
                >
                  <Icon path={ICON_PATHS.archive} size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
