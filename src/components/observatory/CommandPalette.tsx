import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { searchCommands, type Searchable } from './commandSearch';
import '@/styles/command-palette.css';

export interface Command extends Searchable {
  id: string;
  group: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
  /** Shown briefly before the menu closes, for commands with nothing else to show, like copying. */
  confirm?: string;
}

interface Props {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

/**
 * Cmd/Ctrl+K: every island, section, setting and link, a few keystrokes away.
 * A native modal dialog, so it sits above the project panel's own dialog and
 * keeps focus inside it.
 */
export function CommandPalette({ open, commands, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const listId = useId();
  const results = useMemo(() => searchCommands(query, commands), [query, commands]);
  const grouped = query.trim() === '';

  // In step with `open` before the browser paints, so a quick Cmd+K twice never lands out of order.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setActive(0);
      setNotice(null);
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(onClose, 900);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const run = (command: Command | undefined) => {
    if (!command || notice) return;
    if (command.confirm) { command.run(); setNotice(command.confirm); return; }
    // Close first: while the modal is open the page behind it is inert, and
    // commands that move focus there (a new section, the world) would fail.
    // The state is updated here too, since the close event arrives later (or,
    // in some browsers, not at all for a scripted close).
    dialogRef.current?.close();
    onClose();
    command.run();
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(index => (index + step + results.length) % results.length);
    } else if (event.key === 'Home' && results.length) {
      event.preventDefault(); setActive(0);
    } else if (event.key === 'End' && results.length) {
      event.preventDefault(); setActive(results.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(results[active]);
    } else if (event.key === 'Tab') {
      // The list is navigated with the arrow keys; focus stays in the search field.
      event.preventDefault();
    }
  };

  return <dialog ref={dialogRef} className="command-palette" aria-label="Command menu"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}
    onClick={event => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="command-palette-body" onKeyDown={onKeyDown}>
      <label className="command-palette-search">
        <Search size={16} aria-hidden="true" />
        <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Search islands, pages, settings…" aria-label="Search commands"
          role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          autoComplete="off" spellCheck={false} />
        <kbd className="obs-mono">ESC</kbd>
      </label>
      <ul ref={listRef} id={listId} className="command-palette-list" role="listbox" aria-label="Commands">
        {results.map((command, index) => {
          const heading = grouped && (index === 0 || results[index - 1].group !== command.group);
          return <React.Fragment key={command.id}>
            {heading && <li role="presentation" className="command-palette-group obs-mono">{command.group}</li>}
            <li id={`${listId}-${command.id}`} role="option" aria-selected={index === active} data-index={index}
              className="command-palette-item" onPointerMove={() => setActive(index)} onClick={() => run(command)}>
              <span className="command-palette-icon" aria-hidden="true">{command.icon}</span>
              <span className="command-palette-label">{command.label}</span>
              {command.hint && <span className="command-palette-hint">{command.hint}</span>}
              {!grouped && <span className="command-palette-tag obs-mono">{command.group}</span>}
            </li>
          </React.Fragment>;
        })}
        {!results.length && <li role="presentation" className="command-palette-empty">Nothing matches “{query}”.</li>}
      </ul>
      <p className="command-palette-footer obs-mono" role="status" aria-live="polite">
        {notice ?? <><span><kbd>↑</kbd><kbd>↓</kbd> choose</span><span><kbd><CornerDownLeft size={10} aria-hidden="true" /></kbd> run</span></>}
      </p>
    </div>
  </dialog>;
}
