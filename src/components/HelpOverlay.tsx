import React from 'react';
import {Box, Text} from 'ink';
import {colors, lerp} from '../theme.js';
import {Panel} from './Panel.js';
import {Key} from './Key.js';

export interface HelpGroup {
  title: string;
  hints: Array<{key: string; label: string}>;
}

export function HelpOverlay({groups, width}: {groups: HelpGroup[]; width: number}) {
  const borderColor = lerp(colors.accent, colors.rule, 0.55);
  return <Panel title="Keyboard" width={width} borderColorOverride={borderColor} marginTop={1}>
    {groups.map(group => <Box key={group.title} flexDirection="column" marginTop={1}>
      <Text color={colors.accent} bold>{group.title}</Text>
      {group.hints.map(hint => <Text key={hint.key}><Key>{hint.key.padEnd(6)}</Key><Text dimColor>{hint.label}</Text></Text>)}
    </Box>)}
    <Box marginTop={1}><Text dimColor>Press any key to close.</Text></Box>
  </Panel>;
}
