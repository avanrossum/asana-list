import { useMemo } from 'react';
import TaskItem from './TaskItem';
import { filterAndSortTasks } from '../../shared/filters';
import type { AsanaTask, AsanaUser, SortBy } from '../../shared/types';

// ── Props ───────────────────────────────────────────────────────

interface TaskListProps {
  tasks: AsanaTask[];
  searchQuery: string;
  sortBy: SortBy;
  selectedProjectGid: string;
  seenTimestamps: Record<string, string>;
  onMarkSeen: (taskGid: string, modifiedAt: string) => void;
  onComplete: (taskGid: string) => void;
  currentUserId: string | null;
  cachedUsers: AsanaUser[];
  pinnedGids: string[];
  onTogglePin: (type: 'task' | 'project', gid: string) => void;
}

// ── Component ───────────────────────────────────────────────────

export default function TaskList({ tasks, searchQuery, sortBy, selectedProjectGid, seenTimestamps, onMarkSeen, onComplete, currentUserId, cachedUsers, pinnedGids, onTogglePin }: TaskListProps) {
  const filteredAndSorted = useMemo(() =>
    filterAndSortTasks(tasks, { searchQuery, sortBy, selectedProjectGid, pinnedGids }),
    [tasks, searchQuery, sortBy, selectedProjectGid, pinnedGids]
  );

  const pinnedSet = useMemo(() => new Set(pinnedGids), [pinnedGids]);

  if (filteredAndSorted.length === 0 && tasks.length > 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No matching tasks</div>
        <div className="empty-state-text">
          {selectedProjectGid && searchQuery
            ? 'Try a different search term or project.'
            : selectedProjectGid
              ? 'No tasks in this project.'
              : 'Try a different search term.'}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No tasks found</div>
        <div className="empty-state-text">Waiting for data from Asana...</div>
      </div>
    );
  }

  return (
    <>
      {filteredAndSorted.map(task => (
        <TaskItem
          key={task.gid}
          task={task}
          lastSeenModified={seenTimestamps[task.gid]}
          onMarkSeen={onMarkSeen}
          onComplete={onComplete}
          currentUserId={currentUserId}
          cachedUsers={cachedUsers}
          isPinned={pinnedSet.has(task.gid)}
          onTogglePin={onTogglePin}
        />
      ))}
    </>
  );
}
