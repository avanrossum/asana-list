import { useState, useCallback, type CSSProperties } from 'react';

// ── Props ───────────────────────────────────────────────────────

interface FilterListEditorProps {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  style?: CSSProperties;
}

// ── Component ───────────────────────────────────────────────────

export default function FilterListEditor({ label, placeholder, items, onAdd, onRemove, style }: FilterListEditorProps) {
  const [input, setInput] = useState('');

  const handleAdd = useCallback(() => {
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput('');
  }, [input, onAdd]);

  return (
    <div style={style}>
      <div className="form-label">{label}</div>
      <div className="exclusion-list">
        <div className="exclusion-add-row">
          <input
            type="text"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <button onClick={handleAdd}>+ Add</button>
        </div>
        {items.length > 0 && (
          <div className="exclusion-items">
            {items.map((item, i) => (
              <div key={i} className="exclusion-item">
                <span className="exclusion-item-text">{item}</span>
                <button className="exclusion-delete-btn" onClick={() => onRemove(i)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
