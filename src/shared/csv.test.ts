import { describe, it, expect } from 'vitest';
import { escapeCsvField, buildSectionsCsv, buildFieldsCsv } from './csv';

// ── escapeCsvField ──────────────────────────────────────────────

describe('escapeCsvField', () => {
  it('returns plain strings unchanged', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('returns empty string unchanged', () => {
    expect(escapeCsvField('')).toBe('');
  });

  it('wraps strings containing commas in quotes', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"');
  });

  it('wraps strings containing double quotes and escapes them', () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
  });

  it('wraps strings containing newlines in quotes', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('handles strings with commas and quotes together', () => {
    expect(escapeCsvField('a "b", c')).toBe('"a ""b"", c"');
  });
});

// ── buildSectionsCsv ────────────────────────────────────────────

describe('buildSectionsCsv', () => {
  it('returns header only for empty array', () => {
    expect(buildSectionsCsv([])).toBe('Name,GID');
  });

  it('builds CSV with one section', () => {
    const sections = [{ gid: '123', name: 'Backlog' }];
    expect(buildSectionsCsv(sections)).toBe('Name,GID\nBacklog,123');
  });

  it('builds CSV with multiple sections', () => {
    const sections = [
      { gid: '100', name: 'To Do' },
      { gid: '200', name: 'In Progress' },
      { gid: '300', name: 'Done' },
    ];
    const csv = buildSectionsCsv(sections);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('Name,GID');
    expect(lines[1]).toBe('To Do,100');
    expect(lines[2]).toBe('In Progress,200');
    expect(lines[3]).toBe('Done,300');
  });

  it('escapes section names containing commas', () => {
    const sections = [{ gid: '999', name: 'Phase 1, Part A' }];
    expect(buildSectionsCsv(sections)).toBe('Name,GID\n"Phase 1, Part A",999');
  });

  it('escapes section names containing quotes', () => {
    const sections = [{ gid: '888', name: 'The "Special" Section' }];
    expect(buildSectionsCsv(sections)).toBe('Name,GID\n"The ""Special"" Section",888');
  });
});

// ── buildFieldsCsv ──────────────────────────────────────────────

describe('buildFieldsCsv', () => {
  it('returns header only for empty array', () => {
    expect(buildFieldsCsv([])).toBe('Name,Type,GID');
  });

  it('builds CSV with one field', () => {
    const fields = [{ gid: '456', name: 'Priority', type: 'enum' }];
    expect(buildFieldsCsv(fields)).toBe('Name,Type,GID\nPriority,enum,456');
  });

  it('builds CSV with multiple fields', () => {
    const fields = [
      { gid: '10', name: 'Priority', type: 'enum' },
      { gid: '20', name: 'Story Points', type: 'number' },
      { gid: '30', name: 'Sprint', type: 'enum' },
    ];
    const csv = buildFieldsCsv(fields);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('Name,Type,GID');
    expect(lines[1]).toBe('Priority,enum,10');
    expect(lines[2]).toBe('Story Points,number,20');
    expect(lines[3]).toBe('Sprint,enum,30');
  });

  it('escapes field names containing commas', () => {
    const fields = [{ gid: '777', name: 'Cost, Estimate', type: 'number' }];
    expect(buildFieldsCsv(fields)).toBe('Name,Type,GID\n"Cost, Estimate",number,777');
  });

  it('escapes field type containing special characters', () => {
    const fields = [{ gid: '666', name: 'Notes', type: 'multi_enum' }];
    expect(buildFieldsCsv(fields)).toBe('Name,Type,GID\nNotes,multi_enum,666');
  });
});
