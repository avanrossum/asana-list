import { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import { useThemeListener } from '../shared/useThemeListener';
import type { UpdateDialogInitData } from '../shared/types';

// Configure marked for safe output (no raw HTML passthrough)
marked.setOptions({ breaks: true, gfm: true });

// Simple HTML sanitizer — allow only safe tags, strip event handlers
function sanitizeHtml(html: string): string {
  const allowedTags = /^(p|br|strong|em|b|i|ul|ol|li|a|code|pre|h[1-6]|blockquote|hr|div|span)$/i;
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag: string) => {
      if (allowedTags.test(tag)) {
        return match.replace(/\s(on\w+|style|class)="[^"]*"/gi, '');
      }
      return '';
    });
}

// ── Title map ───────────────────────────────────────────────────

const TITLES: Record<UpdateDialogInitData['mode'], string> = {
  'update-available': 'Update Available',
  'update-downloaded': 'Update Ready to Install',
  'whats-new': "What's New"
};

// ── Component ───────────────────────────────────────────────────

export default function UpdateDialog() {
  const [data, setData] = useState<UpdateDialogInitData | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      const initData = await window.updateAPI.getInitData();
      if (initData) {
        setData(initData);
        if (initData.theme) {
          document.documentElement.dataset.theme = initData.theme;
        }
      }
    }
    init();
  }, []);

  // Listen for download progress events from main process
  useEffect(() => {
    const cleanup = window.updateAPI.onDownloadProgress((percent) => {
      setDownloadPercent(percent);
    });
    return cleanup;
  }, []);

  useThemeListener(window.updateAPI);

  // Parse and sanitize release notes
  const safeHtml = useMemo(() => {
    if (!data?.releaseNotes) return '';
    // If already HTML (starts with <), sanitize directly; otherwise parse as Markdown
    const raw = data.releaseNotes.trim();
    const html = raw.startsWith('<') ? raw : marked.parse(raw) as string;
    return sanitizeHtml(html);
  }, [data?.releaseNotes]);

  if (!data) return null;

  const { mode, currentVersion, newVersion } = data;

  return (
    <div className="update-container">
      <div className="update-drag" />
      <div className="update-title">{TITLES[mode] || 'Update'}</div>
      <div className="update-version">
        {mode === 'whats-new'
          ? `v${currentVersion}`
          : `v${currentVersion} → v${newVersion}`}
      </div>

      {safeHtml && (
        <div className="update-notes" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      )}

      {mode === 'update-available' && downloadPercent !== null && (
        <div className="update-progress">
          <div className="update-progress-label">Downloading update...</div>
          <div className="update-progress-track">
            <div className="update-progress-fill" style={{ width: `${downloadPercent}%` }} />
          </div>
          <div className="update-progress-pct">{downloadPercent}%</div>
        </div>
      )}

      <div className="update-actions">
        {mode === 'update-available' && downloadPercent === null && (
          <>
            <button onClick={() => window.updateAPI.close()}>Later</button>
            <button className="btn-primary" onClick={() => {
              setDownloadPercent(0);
              window.updateAPI.downloadUpdate();
            }}>
              Download Update
            </button>
          </>
        )}
        {mode === 'update-downloaded' && (
          <>
            <button onClick={() => window.updateAPI.close()}>Later</button>
            <button className="btn-primary" onClick={() => window.updateAPI.restartForUpdate()}>
              Restart & Install
            </button>
          </>
        )}
        {mode === 'whats-new' && (
          <button className="btn-primary" onClick={() => window.updateAPI.close()}>
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
