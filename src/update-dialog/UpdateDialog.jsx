import { useState, useEffect } from 'react';

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

    const unsub = window.updateAPI.onThemeChanged((theme) => {
      document.documentElement.dataset.theme = theme;
    });
    return () => unsub();
  }, []);

  if (!data) return null;

  const { mode, currentVersion, newVersion, releaseNotes } = data;

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

      {releaseNotes && (
        <div className="update-notes" dangerouslySetInnerHTML={{ __html: releaseNotes }} />
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
