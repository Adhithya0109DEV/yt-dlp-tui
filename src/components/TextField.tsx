import React from 'react';
import {Text} from 'ink';
import {colors} from '../theme.js';

export function TextField({value, placeholder, focused, maxWidth}: {value: string; placeholder: string; focused: boolean; maxWidth?: number}) {
  if (!value) {
    return <Text>
      {focused ? <Text inverse>{placeholder.slice(0, 1)}</Text> : placeholder.slice(0, 1)}
      <Text dimColor>{placeholder.slice(1)}</Text>
    </Text>;
  }
  const visible = maxWidth && value.length > maxWidth ? `…${value.slice(-(maxWidth - 1))}` : value;
  return <Text color={colors.text}>
    {visible}
    {focused && <Text inverse> </Text>}
  </Text>;
}
