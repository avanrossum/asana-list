import { useState, useCallback } from 'react';

/**
 * Reusable filter list editor for inclusion/exclusion patterns.
 *
 * @param {Object} props
 * @param {string} props.label - Label above the list (e.g. "Included Tasks (name pattern)")
 * @param {string} props.placeholder - Input placeholder text
 * @param {string[]} props.items - Current list of patterns
 * @param {(value: string) => void} props.onAdd - Callback when adding a pattern
 * @param {(index: number) => void} props.onRemove - Callback when removing by index
 * @param {{ marginTop?: string }} [props.style] - Optional inline style for wrapper
 */
export default function FilterListEditor({ label, placeholder, items, onAdd, onRemove, style }) {
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
