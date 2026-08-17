import React from 'react';
import {Text} from 'ink';
import {colors} from '../theme.js';

export function Key({children}: {children: React.ReactNode}) {
  return <Text color={colors.alt}>{children}</Text>;
}
