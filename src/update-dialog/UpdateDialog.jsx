import { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import { useThemeListener } from '../shared/useThemeListener';

// Configure marked for safe output (no raw HTML passthrough)
marked.setOptions({ breaks: true, gfm: true });

// Simple HTML sanitizer — allow only safe tags, strip event handlers
function sanitizeHtml(html) {
  const allowedTags = /^(p|br|strong|em|b|i|ul|ol|li|a|code|pre|h[1-6]|blockquote|hr|div|span)$/i;
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
      if (allowedTags.test(tag)) {
        return match.replace(/\s(on\w+|style|class)="[^"]*"/gi, '');
      }
      return '';
    });
}

export default function UpdateDialog() {
  const [data, setData] = useState(null);

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

  useThemeListener(window.updateAPI);

  // Parse and sanitize release notes
  const safeHtml = useMemo(() => {
    if (!data?.releaseNotes) return '';
    // If already HTML (starts with <), sanitize directly; otherwise parse as Markdown
    const raw = data.releaseNotes.trim();
    const html = raw.startsWith('<') ? raw : marked.parse(raw);
    return sanitizeHtml(html);
  }, [data?.releaseNotes]);

  if (!data) return null;

  const { mode, currentVersion, newVersion } = data;

  const titles = {
    'update-available': 'Update Available',
    'update-downloaded': 'Update Ready to Install',
    'whats-new': "What's New"
  };

  return (
    <div className="update-container">
      <div className="update-drag" />
      <div className="update-title">{titles[mode] || 'Update'}</div>
      <div className="update-version">
        {mode === 'whats-new'
          ? `v${currentVersion}`
          : `v${currentVersion} → v${newVersion}`}
      </div>

      {safeHtml && (
        <div className="update-notes" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      )}

      <div className="update-actions">
        {mode === 'update-available' && (
          <>
            <button onClick={() => window.updateAPI.close()}>Later</button>
            <button className="btn-primary" onClick={() => window.updateAPI.downloadUpdate()}>
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
