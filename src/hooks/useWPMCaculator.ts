// src/hooks/useWPMCalculator.ts

import { useComputed } from '@preact/signals-react';
import { useCallback } from 'react';

import { keystrokesSignal, addKeystroke, clearKeystrokes } from 'src/signals/commandLineSignals';

import { type WPM, type WPMs } from '../types/Types';


export const useWPMCalculator = (): {
  addKeystroke: (char: string) => void;
  getWPMs: () => WPMs;
  clearKeystrokes: () => void;
  keystrokeCount: number;
} => {
  const keystrokes = useComputed(() => keystrokesSignal.value);


  const getWPMs = useCallback((): WPMs => {
    if (keystrokes.value.length < 2) return { wpmAverage: 0, charWpms: [] };

    const charWpms: WPM[] = [];
    let totalWPM = 0;

    for (let i = 1; i < keystrokes.value.length; i++) {
      const current = keystrokes.value[i];
      const previous = keystrokes.value[i-1];
      if (!current || !previous) continue;

      const duration = current.timestamp - previous.timestamp;
      const minutes = duration / 60000; // Convert to minutes
      const cpm = 1 / minutes; // 1 character per minute.
      const wpm = cpm / 5; // five character words per minute.

      charWpms.push({
        character: current.char,
        wpm,
        durationMilliseconds: duration
      });

      totalWPM += wpm;
    }

    const wpmAverage = totalWPM / (keystrokes.value.length - 1);

    return {
      wpmAverage,
      charWpms: Object.freeze(charWpms) // Make charWpms immutable
    };
  }, [keystrokes]);

  return {
    addKeystroke,
    getWPMs, // Return the memoized value
    clearKeystrokes,
    keystrokeCount: keystrokes.value.length // Add this for debugging
  };
};
