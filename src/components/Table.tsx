import React from 'react';
import {Box, Text} from 'ink';
import {colors, icons} from '../theme.js';

export interface RowEmphasis {
  color?: string;
  bold?: boolean;
  dimColor?: boolean;
}

export interface Column<T> {
  label: string;
  width: number;
  align?: 'left' | 'right';
  render: (row: T, emphasis: RowEmphasis) => React.ReactNode;
}

function pad(text: string, width: number, align: 'left' | 'right' = 'left'): string {
  const clipped = text.length > width ? text.slice(0, width) : text;
  return align === 'right' ? clipped.padStart(width) : clipped.padEnd(width);
}

export function Table<T>({columns, rows, cursorIndex, keyOf, emptyText, showGutter = true}: {
  columns: Column<T>[];
  rows: T[];
  cursorIndex?: number;
  keyOf: (row: T, index: number) => string;
  emptyText: string;
  showGutter?: boolean;
}) {
  if (!rows.length) return <Text dimColor>{emptyText}</Text>;
  return <Box flexDirection="column">
    <Box>
      {showGutter && <Text>{'  '}</Text>}
      {columns.map(column => <Text key={column.label} bold dimColor>{pad(column.label, column.width, column.align)} </Text>)}
    </Box>
    {rows.map((row, index) => {
      const emphasis: RowEmphasis = index === cursorIndex ? {color: colors.accent, bold: true} : {dimColor: true};
      return <Box key={keyOf(row, index)}>
        {showGutter && <Text color={colors.accent}>{index === cursorIndex ? `${icons.pointer} ` : '  '}</Text>}
        {columns.map(column => {
          const content = column.render(row, emphasis);
          const cell = typeof content === 'string' ? pad(content, column.width, column.align) : content;
          return <Text key={column.label} {...emphasis}>{cell} </Text>;
        })}
      </Box>;
    })}
  </Box>;
}
