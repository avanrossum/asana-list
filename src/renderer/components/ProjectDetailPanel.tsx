import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import DescriptionRenderer from './DescriptionRenderer';
import { ICON_PATHS } from '../icons';
import { formatRelativeTime } from '../../shared/formatters';
import { useCopyToClipboard } from '../../shared/useCopyToClipboard';
import type { AsanaSection, AsanaSectionTask, ProjectDetail } from '../../shared/types';

// ── Props ───────────────────────────────────────────────────────

interface ProjectDetailPanelProps {
  projectGid: string;
  onClose: () => void;
  onNavigateToTask: (taskGid: string) => void;
  onTogglePin: (type: 'task' | 'project', gid: string) => void;
  isPinned: boolean;
}

// ── Color Map ───────────────────────────────────────────────────

const PROJECT_COLORS: Record<string, string> = {
  'dark-pink': '#ea4e9d',
  'dark-green': '#62d26f',
  'dark-blue': '#4186e0',
  'dark-red': '#e8384f',
  'dark-teal': '#4ecbc4',
  'dark-brown': '#d97706',
  'dark-orange': '#fd9a00',
  'dark-purple': '#7c3aed',
  'dark-warm-gray': '#8d8d8d',
  'light-pink': '#f9aaef',
  'light-green': '#b4ec93',
  'light-blue': '#9ee7e3',
  'light-red': '#f19c8e',
  'light-teal': '#a4e3d5',
  'light-brown': '#eec300',
  'light-orange': '#fad47e',
  'light-purple': '#b9a7ff',
  'light-warm-gray': '#c7c7c7',
  'none': '#8890a0'
};

// ── Component ───────────────────────────────────────────────────

export default function ProjectDetailPanel({
  projectGid, onClose, onNavigateToTask, onTogglePin, isPinned
}: ProjectDetailPanelProps) {
  // Data states
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [sections, setSections] = useState<AsanaSection[] | null>(null);
  const [sectionTasks, setSectionTasks] = useState<Record<string, AsanaSectionTask[]>>({});
  const [loadingSectionTasks, setLoadingSectionTasks] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  // UI states
  const [copiedGid, copyGid] = useCopyToClipboard();
  const [copiedName, copyName] = useCopyToClipboard();
  const [copiedUrl, copyUrl] = useCopyToClipboard();

  // ── Data Fetching ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    setLoadingDetail(true);
    setLoadingSections(true);
    setDetailError(null);
    setDetail(null);
    setSections(null);
    setSectionTasks({});
    setLoadingSectionTasks(new Set());
    setExpandedSections(new Set());

    // Parallel fetches
    window.electronAPI.getProjectDetail(projectGid)
      .then(d => { if (!cancelled) { setDetail(d); setLoadingDetail(false); } })
      .catch(err => { if (!cancelled) { setDetailError((err as Error).message); setLoadingDetail(false); } });

    window.electronAPI.getProjectSections(projectGid)
      .then(s => { if (!cancelled) { setSections(s); setLoadingSections(false); } })
      .catch(() => { if (!cancelled) { setSections([]); setLoadingSections(false); } });

    return () => { cancelled = true; };
  }, [projectGid]);

  // ── Keyboard ───────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ── Handlers ───────────────────────────────────────────────

  const handleOpenInAsana = useCallback(() => {
    const url = `https://app.asana.com/0/${projectGid}`;
    window.electronAPI.openUrl(url);
  }, [projectGid]);

  const handleOpenTaskInAsana = useCallback((taskGid: string) => {
    const url = `https://app.asana.com/0/0/${taskGid}/f`;
    window.electronAPI.openUrl(url);
  }, []);

  const handleToggleSection = useCallback(async (sectionGid: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionGid)) {
        next.delete(sectionGid);
      } else {
        next.add(sectionGid);
      }
      return next;
    });

    // Lazy-load tasks on first expand
    if (!sectionTasks[sectionGid] && !loadingSectionTasks.has(sectionGid)) {
      setLoadingSectionTasks(prev => new Set(prev).add(sectionGid));
      try {
        const tasks = await window.electronAPI.getSectionTasks(sectionGid);
        setSectionTasks(prev => ({ ...prev, [sectionGid]: tasks }));
      } catch {
        setSectionTasks(prev => ({ ...prev, [sectionGid]: [] }));
      }
      setLoadingSectionTasks(prev => {
        const next = new Set(prev);
        next.delete(sectionGid);
        return next;
      });
    }
  }, [sectionTasks, loadingSectionTasks]);

  // ── Derived Data ───────────────────────────────────────────

  const modifiedText = detail ? formatRelativeTime(detail.modified_at) : '';
  const dotColor = detail ? (PROJECT_COLORS[detail.color] || PROJECT_COLORS.none) : PROJECT_COLORS.none;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="project-detail-overlay">
      {/* Header */}
      <div className="task-detail-header">
        <button className="task-detail-back" onClick={onClose} title="Back">
          <Icon path={ICON_PATHS.arrowLeft} size={18} />
        </button>
        <span className="project-color-dot" style={{ background: dotColor, flexShrink: 0 }} />
        <div className="task-detail-header-title">
          {loadingDetail ? 'Loading...' : detail?.name || 'Project'}
        </div>
        <div className="task-detail-header-actions">
          <button
            className={`task-btn pin ${isPinned ? 'active' : ''}`}
            onClick={() => onTogglePin('project', projectGid)}
            title={isPinned ? 'Unpin' : 'Pin to Top'}
          >
            <Icon path={ICON_PATHS.pin} size={12} />
          </button>
          <button className="task-btn primary" onClick={handleOpenInAsana}>
            Open in Asana
          </button>
          <button className="task-btn secondary" onClick={() => copyUrl(`https://app.asana.com/0/${projectGid}`)}>
            {copiedUrl ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="task-detail-body">
        {detailError ? (
          <div className="task-detail-error">Failed to load project: {detailError}</div>
        ) : loadingDetail ? (
          <div className="task-detail-loading">Loading project details...</div>
        ) : detail ? (
          <>
            {/* Meta Section */}
            <div className="task-detail-section task-detail-meta">
              {/* Project Name with Copy */}
              <div className="task-detail-name-row">
                <span className="task-detail-task-name">{detail.name}</span>
                <button
                  className="task-inline-copy task-inline-copy-always"
                  onClick={() => copyName(detail.name)}
                  title={copiedName ? 'Copied!' : 'Copy project name'}
                >
                  <Icon path={ICON_PATHS.copy} size={12} />
                </button>
                {copiedName && <span className="task-copied-label">Copied!</span>}
              </div>

              {/* GID with Copy */}
              <div className="task-detail-gid-row">
                <span className="task-detail-gid">{detail.gid}</span>
                <button
                  className="task-inline-copy task-inline-copy-always"
                  onClick={() => copyGid(detail.gid)}
                  title={copiedGid ? 'Copied!' : 'Copy project GID'}
                >
                  <Icon path={ICON_PATHS.copy} size={12} />
                </button>
                {copiedGid && <span className="task-copied-label">Copied!</span>}
              </div>

              {/* Owner + Modified */}
              <div className="task-detail-meta-row">
                {detail.owner?.name && (
                  <span>{detail.owner.name}</span>
                )}
                {modifiedText && (
                  <span className="task-item-modified" title={detail.modified_at}>
                    {modifiedText}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              {detail.current_status && (
                <div className={`project-detail-status ${detail.current_status.color || ''}`}>
                  {detail.current_status.title}
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="task-detail-section">
              <div className="task-detail-section-title">Description</div>
              {detail.notes ? (
                <div className="task-detail-description">
                  <DescriptionRenderer text={detail.notes} htmlText={detail.html_notes} users={[]} membershipMap={{}} />
                </div>
              ) : (
                <div className="task-detail-empty">No description</div>
              )}
            </div>

            {/* Collaborators Section */}
            {detail.members && detail.members.length > 0 && (
              <div className="task-detail-section">
                <div className="task-detail-section-title">
                  Collaborators
                  <span className="task-detail-section-count">{detail.members.length}</span>
                </div>
                <div className="project-detail-collaborators">
                  {detail.members.map(member => (
                    <span key={member.gid} className="project-detail-collaborator">
                      {member.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sections Section */}
            <div className="task-detail-section">
              <div className="task-detail-section-title">
                Sections
                {sections && sections.length > 0 && (
                  <span className="task-detail-section-count">{sections.length}</span>
                )}
              </div>
              {loadingSections ? (
                <div className="task-detail-loading-inline">Loading sections...</div>
              ) : sections && sections.length > 0 ? (
                <div className="project-detail-sections">
                  {sections.map(section => {
                    const isExpanded = expandedSections.has(section.gid);
                    const tasks = sectionTasks[section.gid];
                    const isLoadingTasks = loadingSectionTasks.has(section.gid);
                    return (
                      <div key={section.gid} className="project-detail-section-group">
                        <button
                          className="project-detail-section-header"
                          onClick={() => handleToggleSection(section.gid)}
                        >
                          <span className={`comment-collapse-btn ${isExpanded ? 'expanded' : ''}`}>
                            <Icon path={ICON_PATHS.chevronRight} size={14} />
                          </span>
                          <span>{section.name}</span>
                          {tasks && (
                            <span className="task-detail-section-count">{tasks.length}</span>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="project-detail-section-tasks">
                            {isLoadingTasks ? (
                              <div className="task-detail-loading-inline">Loading tasks...</div>
                            ) : tasks && tasks.length > 0 ? (
                              tasks.map(task => (
                                <div key={task.gid} className="project-section-task-item">
                                  <span className="task-detail-subtask-check">{'\u25CB'}</span>
                                  <button
                                    className="project-section-task-name"
                                    onClick={() => onNavigateToTask(task.gid)}
                                    title={task.name}
                                  >
                                    {task.name}
                                  </button>
                                  {task.assignee && (
                                    <span className="project-section-task-assignee">{task.assignee.name}</span>
                                  )}
                                  <button
                                    className="project-section-task-open"
                                    onClick={(e) => { e.stopPropagation(); handleOpenTaskInAsana(task.gid); }}
                                    title="Open in Asana"
                                  >
                                    <Icon path={ICON_PATHS.openExternal} size={12} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="task-detail-empty">No incomplete tasks</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="task-detail-empty">No sections</div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
