import React from 'react';
import {Text} from 'ink';
import type {JobStatus} from '../types.js';
import {statusColor, statusLabel} from '../theme.js';

export function Status({status}: {status: JobStatus}) {
  return <Text color={statusColor[status]} bold>[{statusLabel[status]}]</Text>;
}
