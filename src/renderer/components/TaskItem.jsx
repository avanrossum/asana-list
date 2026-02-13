import { useState, useCallback } from 'react';
import Icon from './Icon';
import { ICON_PATHS } from '../icons';

/**
 * Comment highlighting logic:
 * - We track a "lastSeenModified" timestamp per task (stored in the main process store).
 * - If the task's modified_at is newer than lastSeenModified, show highlight.
 * - When the user expands comments, we update lastSeenModified to current modified_at.
 * - If the last comment was authored by the "I am" user, suppress the highlight.
 */
export default function TaskItem({ task, lastSeenModified, onMarkSeen, currentUserId }) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [comments, setComments] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [suppressHighlight, setSuppressHighlight] = useState(false);

  // Determine if task has been modified since last comment view
  const taskModified = task.modified_at ? new Date(task.modified_at).getTime() : 0;
  const seenTime = lastSeenModified ? new Date(lastSeenModified).getTime() : 0;
  const hasNewActivity = lastSeenModified !== undefined && taskModified > seenTime && !suppressHighlight;

  const handleToggleComments = useCallback(async () => {
    if (!commentsExpanded) {
      setLoadingComments(true);
      try {
        const result = await window.electronAPI.getTaskComments(task.gid);
        setComments(result);

        // Check if the last comment is from the current user
        const lastComment = result.length > 0 ? result[result.length - 1] : null;
        const isMyComment = lastComment && currentUserId &&
          lastComment.created_by?.gid === currentUserId;

        if (isMyComment) {
          setSuppressHighlight(true);
        }

        // Mark as seen with current modified_at
        onMarkSeen(task.gid, task.modified_at);
      } catch (err) {
        console.error('Failed to load comments:', err);
        setComments([]);
      }
      setLoadingComments(false);
    }
    setCommentsExpanded(!commentsExpanded);
  }, [commentsExpanded, task.gid, task.modified_at, onMarkSeen, currentUserId]);

  const handleOpenTask = useCallback(() => {
    const url = `https://app.asana.com/0/0/${task.gid}/f`;
    window.open(url, '_blank');
  }, [task.gid]);

  const handleCopyGid = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(task.gid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [task.gid]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    window.electronAPI.showItemContextMenu({ type: 'task', name: task.name, gid: task.gid });
  }, [task.name, task.gid]);

  // Format due date
  const dueDate = task.due_on || task.due_at;
  let dueDateText = '';
  let isOverdue = false;
  if (dueDate) {
    const d = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    isOverdue = d < now;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.getTime() === today.getTime()) {
      dueDateText = 'Today';
    } else if (d.getTime() === tomorrow.getTime()) {
      dueDateText = 'Tomorrow';
    } else {
      dueDateText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  const projectName = task.projects?.[0]?.name;
  const sectionName = task.memberships?.[0]?.section?.name;

  return (
    <div className={`task-item ${hasNewActivity ? 'highlighted' : ''}`} onContextMenu={handleContextMenu}>
      <div className="task-item-header" onClick={handleToggleComments}>
        <div className="task-item-content">
          <div className="task-item-name">{task.name}</div>
          <div className="task-item-meta">
            {task.assignee && (
              <span className="task-item-assignee">{task.assignee.name}</span>
            )}
            {dueDate && (
              <span className={`task-item-due ${isOverdue ? 'overdue' : ''}`}>
                {dueDateText}
              </span>
            )}
            {projectName && (
              <span className="task-item-project" title={projectName}>
                {sectionName ? `${projectName} / ${sectionName}` : projectName}
              </span>
            )}
          </div>
        </div>
        <div className="task-item-actions" onClick={(e) => e.stopPropagation()}>
          <button className="task-btn primary" onClick={handleOpenTask}>
            Open Task
          </button>
          <button className="task-btn secondary" onClick={handleCopyGid}>
            {copied ? 'Copied!' : 'Copy GID'}
          </button>
        </div>
      </div>

      {/* Comment toggle */}
      <button className="comment-toggle" onClick={handleToggleComments}>
        <span className={`comment-toggle-icon ${commentsExpanded ? 'expanded' : ''}`}>
          <Icon path={ICON_PATHS.chevronRight} size={12} />
        </span>
        <Icon path={ICON_PATHS.comment} size={12} />
        <span>Comments</span>
        {hasNewActivity && <span className="comment-badge">New</span>}
      </button>

      {/* Comments section */}
      {commentsExpanded && (
        <div className="comments-section">
          {loadingComments ? (
            <div className="comments-loading">Loading comments...</div>
          ) : comments && comments.length > 0 ? (
            comments.slice(-5).map((comment, i) => (
              <div key={comment.gid || i} className="comment-item">
                <span className="comment-author">{comment.created_by?.name || 'Unknown'}</span>
                <span className="comment-date">
                  {new Date(comment.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </span>
                <div className="comment-text">{comment.text}</div>
              </div>
            ))
          ) : (
            <div className="comments-loading">No comments yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
