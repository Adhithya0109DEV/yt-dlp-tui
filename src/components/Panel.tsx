import React from 'react';
import {Box, Text} from 'ink';
import {colors} from '../theme.js';

export function Rule({width}: {width: number}) {
  return <Text color={colors.rule}>{'─'.repeat(Math.max(0, width))}</Text>;
}

export function Panel({title, count, width, focused = false, tone, marginTop = 1, borderColorOverride, children}: {
  title: string;
  count?: number;
  width: number;
  focused?: boolean;
  tone?: 'bad';
  marginTop?: number;
  borderColorOverride?: string;
  children: React.ReactNode;
}) {
  const borderColor = borderColorOverride || (tone === 'bad' ? colors.bad : focused ? colors.accent : colors.rule);
  const label = count ? `${title} (${count})` : title;
  const fill = Math.max(0, width - 5 - label.length);
  return <Box flexDirection="column" marginTop={marginTop}>
    <Box>
      <Text color={borderColor}>{'╭─ '}</Text>
      <Text color={borderColor} bold>{label}</Text>
      <Text color={borderColor}>{` ${'─'.repeat(fill)}╮`}</Text>
    </Box>
    <Box width={width} borderStyle="round" borderColor={borderColor} borderTop={false} flexDirection="column" paddingX={1}>
      {children}
    </Box>
  </Box>;
}
