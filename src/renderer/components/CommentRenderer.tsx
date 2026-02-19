import type { ReactNode } from 'react';
import { parseCommentSegments } from '../../shared/formatters';
import type { AsanaUser } from '../../shared/types';

// ── Props ───────────────────────────────────────────────────────

interface CommentRendererProps {
  text: string | null | undefined;
  users: AsanaUser[];
}

// ── Component ───────────────────────────────────────────────────

/**
 * Render parsed comment segments as React elements.
 * Resolves Asana profile links to display names and makes URLs clickable.
 */
export default function CommentRenderer({ text, users }: CommentRendererProps): ReactNode {
  const segments = parseCommentSegments(text, users);
  if (!segments) return null;

  return segments.map((seg, i) => {
    if (seg.type === 'profile') {
      return (
        <a
          key={i}
          className="comment-link comment-profile-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI.openUrl(seg.url!);
          }}
          title="Open profile in Asana"
        >
          [{seg.value}]
        </a>
      );
    } else if (seg.type === 'url') {
      return (
        <a
          key={i}
          className="comment-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI.openUrl(seg.url!);
          }}
          title={seg.url}
        >
          {seg.value}
        </a>
      );
    } else {
      return seg.value;
    }
  });
}
