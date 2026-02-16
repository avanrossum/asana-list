import { useMemo, useState, useCallback } from 'react';
import Icon from './Icon';
import { ICON_PATHS } from '../icons';
import { filterAndSortProjects } from '../../shared/filters';
import { buildSectionsCsv, buildFieldsCsv } from '../../shared/csv';
import type { AsanaProject, AsanaSection, AsanaField } from '../../shared/types';

// ── Color Map ───────────────────────────────────────────────────

// Map Asana project colors to hex values
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

// ── Types ───────────────────────────────────────────────────────

type DetailTab = 'sections' | 'fields';

// ── Props ───────────────────────────────────────────────────────

interface ProjectListProps {
  projects: AsanaProject[];
  searchQuery: string;
  myProjectsOnly: boolean;
  currentUserId: string | null;
}

interface ProjectItemProps {
  project: AsanaProject;
}

// ── Component ───────────────────────────────────────────────────

export default function ProjectList({ projects, searchQuery, myProjectsOnly, currentUserId }: ProjectListProps) {
  const filtered = useMemo(() =>
    filterAndSortProjects(projects, { searchQuery, myProjectsOnly, currentUserId }),
    [projects, searchQuery, myProjectsOnly, currentUserId]
  );

  if (filtered.length === 0 && projects.length > 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No matching projects</div>
        <div className="empty-state-text">Try a different search term.</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No projects found</div>
        <div className="empty-state-text">Waiting for data from Asana...</div>
      </div>
    );
  }

  return (
    <>
      {filtered.map(project => (
        <ProjectItem key={project.gid} project={project} />
      ))}
    </>
  );
}

function ProjectItem({ project }: ProjectItemProps) {
  const [copied, setCopied] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('sections');

  // Sections state
  const [sections, setSections] = useState<AsanaSection[] | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [copiedSectionGid, setCopiedSectionGid] = useState<string | null>(null);

  // Fields state
  const [fields, setFields] = useState<AsanaField[] | null>(null);
  const [loadingFields, setLoadingFields] = useState(false);
  const [copiedFieldGid, setCopiedFieldGid] = useState<string | null>(null);

  const handleOpenProject = useCallback(() => {
    const url = `https://app.asana.com/0/${project.gid}`;
    window.electronAPI.openUrl(url);
  }, [project.gid]);

  const handleCopyGid = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(project.gid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [project.gid]);

  const handleTogglePanel = useCallback(async () => {
    if (!panelExpanded && sections === null) {
      // First expand — load sections
      setLoadingSections(true);
      try {
        const result = await window.electronAPI.getProjectSections(project.gid);
        setSections(result);
      } catch (err) {
        console.error('Failed to load sections:', err);
        setSections([]);
      }
      setLoadingSections(false);
    }
    setPanelExpanded(!panelExpanded);
  }, [panelExpanded, sections, project.gid]);

  const handleSwitchTab = useCallback(async (tab: DetailTab) => {
    setActiveTab(tab);
    if (tab === 'fields' && fields === null) {
      // Lazy-load fields on first switch
      setLoadingFields(true);
      try {
        const result = await window.electronAPI.getProjectFields(project.gid);
        setFields(result);
      } catch (err) {
        console.error('Failed to load fields:', err);
        setFields([]);
      }
      setLoadingFields(false);
    }
  }, [fields, project.gid]);

  const handleCopySectionGid = useCallback(async (sectionGid: string) => {
    try {
      await navigator.clipboard.writeText(sectionGid);
      setCopiedSectionGid(sectionGid);
      setTimeout(() => setCopiedSectionGid(null), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, []);

  const handleCopyFieldGid = useCallback(async (fieldGid: string) => {
    try {
      await navigator.clipboard.writeText(fieldGid);
      setCopiedFieldGid(fieldGid);
      setTimeout(() => setCopiedFieldGid(null), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, []);

  const handleExportSectionsCsv = useCallback(async () => {
    if (!sections || sections.length === 0) return;
    const csv = buildSectionsCsv(sections);
    const filename = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}-sections.csv`;
    await window.electronAPI.exportCsv(filename, csv);
  }, [sections, project.name]);

  const handleExportFieldsCsv = useCallback(async () => {
    if (!fields || fields.length === 0) return;
    const csv = buildFieldsCsv(fields);
    const filename = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}-fields.csv`;
    await window.electronAPI.exportCsv(filename, csv);
  }, [fields, project.name]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.showItemContextMenu({ type: 'project', name: project.name, gid: project.gid });
  }, [project.name, project.gid]);

  const dotColor = PROJECT_COLORS[project.color] || PROJECT_COLORS.none;

  return (
    <div className="project-item" onContextMenu={handleContextMenu}>
      <div className="project-item-header">
        <span className="project-color-dot" style={{ background: dotColor }} />
        <div className="project-item-content">
          <div className="project-item-name">{project.name}</div>
          <div className="project-item-meta">
            {project.owner?.name && <span>{project.owner.name}</span>}
          </div>
        </div>
        <div className="project-item-actions">
          <button className="task-btn primary" onClick={handleOpenProject}>
            Open Project
          </button>
          <button className="task-btn secondary" onClick={handleCopyGid}>
            {copied ? 'Copied!' : 'Copy GID'}
          </button>
        </div>
      </div>

      {/* Sections & Fields toggle */}
      <button className="comment-toggle" onClick={handleTogglePanel}>
        <span className={`comment-toggle-icon ${panelExpanded ? 'expanded' : ''}`}>
          <Icon path={ICON_PATHS.chevronRight} size={12} />
        </span>
        <Icon path={ICON_PATHS.folder} size={12} />
        <span>Sections &amp; Fields</span>
      </button>

      {/* Detail panel */}
      {panelExpanded && (
        <div className="detail-panel">
          {/* Tab bar */}
          <div className="detail-tabs">
            <button
              className={`detail-tab ${activeTab === 'sections' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('sections')}
            >
              Sections
            </button>
            <button
              className={`detail-tab ${activeTab === 'fields' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('fields')}
            >
              Fields
            </button>
          </div>

          {/* Sections tab */}
          {activeTab === 'sections' && (
            <div className="detail-tab-content">
              {loadingSections ? (
                <div className="comments-loading">Loading sections...</div>
              ) : sections && sections.length > 0 ? (
                <>
                  {sections.map(section => (
                    <div key={section.gid} className="section-item">
                      <span className="section-item-name" title={section.name}>{section.name}</span>
                      <button
                        className="task-btn secondary"
                        onClick={() => handleCopySectionGid(section.gid)}
                      >
                        {copiedSectionGid === section.gid ? 'Copied!' : 'Copy GID'}
                      </button>
                    </div>
                  ))}
                  <div className="detail-panel-footer">
                    <button className="task-btn secondary" onClick={handleExportSectionsCsv}>
                      Export CSV
                    </button>
                  </div>
                </>
              ) : (
                <div className="comments-loading">No sections found.</div>
              )}
            </div>
          )}

          {/* Fields tab */}
          {activeTab === 'fields' && (
            <div className="detail-tab-content">
              {loadingFields ? (
                <div className="comments-loading">Loading fields...</div>
              ) : fields && fields.length > 0 ? (
                <>
                  {fields.map(field => (
                    <div key={field.gid} className="section-item">
                      <span className="section-item-name" title={field.name}>{field.name}</span>
                      <span className="field-type">{field.type}</span>
                      <button
                        className="task-btn secondary"
                        onClick={() => handleCopyFieldGid(field.gid)}
                      >
                        {copiedFieldGid === field.gid ? 'Copied!' : 'Copy GID'}
                      </button>
                    </div>
                  ))}
                  <div className="detail-panel-footer">
                    <button className="task-btn secondary" onClick={handleExportFieldsCsv}>
                      Export CSV
                    </button>
                  </div>
                </>
              ) : (
                <div className="comments-loading">No fields found.</div>
              )}
              <div className="detail-hint">
                If you don't see what you expect here, make sure the project has at least one task and resync.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
