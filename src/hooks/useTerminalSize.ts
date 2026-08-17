import {useEffect, useRef, useState} from 'react';
import {useStdout} from 'ink';

export interface TerminalSize {
  columns: number;
  rows: number;
  compact: boolean;
  compactHeight: boolean;
  hideFooter: boolean;
}

export function useTerminalSize(): TerminalSize {
  const {stdout} = useStdout();
  const [size, setSize] = useState({columns: stdout.columns || 100, rows: stdout.rows || 24});
  const previous = useRef(size);

  useEffect(() => {
    const update = () => {
      const next = {columns: stdout.columns || 100, rows: stdout.rows || 24};
      if (next.columns < previous.current.columns || next.rows < previous.current.rows) {
        stdout.write('[2J[H');
      }
      previous.current = next;
      setSize(next);
    };
    stdout.on('resize', update);
    return () => { stdout.off('resize', update); };
  }, [stdout]);

  return {
    columns: size.columns,
    rows: size.rows,
    compact: size.columns < 86,
    compactHeight: size.rows < 18,
    hideFooter: size.rows < 12,
  };
}
