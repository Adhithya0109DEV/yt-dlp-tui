import React, {useEffect, useRef, useState} from 'react';
import {Text} from 'ink';
import {colors, lerp, ramp} from '../theme.js';

const SHEEN_HALF_WIDTH = 4.5;
const SHEEN_GAP = 8;
const SHEEN_STEP = 0.45;

function collapseRuns(cells: string[]): Array<{color: string; count: number}> {
  const runs: Array<{color: string; count: number}> = [];
  for (const color of cells) {
    const last = runs[runs.length - 1];
    if (last && last.color === color) last.count += 1;
    else runs.push({color, count: 1});
  }
  return runs;
}

export function ProgressBar({percent, width, animate = true}: {percent: number; width: number; animate?: boolean}) {
  const [displayed, setDisplayed] = useState(percent);
  const [sweep, setSweep] = useState(0);
  const target = useRef(percent);
  target.current = percent;

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayed(current => {
        const goal = target.current;
        if (Math.abs(goal - current) < 0.05) return goal;
        return Math.min(goal, current + Math.max(0.12, (goal - current) * 0.18));
      });
      if (animate) setSweep(current => current + SHEEN_STEP);
    }, 40);
    return () => clearInterval(timer);
  }, [animate]);

  const safeWidth = Math.max(8, width);
  const filled = Math.round((Math.max(0, Math.min(100, displayed)) / 100) * safeWidth);
  const cycle = filled + SHEEN_GAP;
  const sweepPos = cycle > 0 ? sweep % cycle : 0;

  const cells: string[] = [];
  for (let i = 0; i < filled; i += 1) {
    const base = ramp(filled > 1 ? i / (filled - 1) : 0, colors.deep, colors.accent, colors.bright);
    const distance = Math.abs(i - sweepPos);
    const intensity = animate && distance <= SHEEN_HALF_WIDTH
      ? 0.5 * (1 + Math.cos((Math.PI * distance) / SHEEN_HALF_WIDTH))
      : 0;
    cells.push(intensity > 0.01 ? lerp(base, colors.sheen, intensity * 0.9) : base);
  }
  const runs = collapseRuns(cells);

  return <Text>
    {runs.map((run, index) => <Text key={index} color={run.color}>{'█'.repeat(run.count)}</Text>)}
    <Text color={colors.rule}>{'░'.repeat(Math.max(0, safeWidth - filled))}</Text>
  </Text>;
}
