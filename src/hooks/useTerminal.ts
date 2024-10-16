// hooks/useTerminal.ts
import { useCallback, useState, useEffect, useRef, MutableRefObject } from 'react';
import { useXTerm } from 'react-xtermjs';
import { FitAddon } from '@xterm/addon-fit';
import { XtermAdapterConfig } from '../components/XtermAdapterConfig';
import { useCommand } from './useCommand';
import { useWPMCalculator } from './useWPMCaculator';
import { addKeystroke, commandLineSignal, setCommand } from 'src/signals/commandLineSignals';
import { useComputed } from '@preact/signals-react';
import { setCommandLine } from 'src/signals/commandLineSignals';
import { setActivity } from 'src/signals/appSignals';
import { ActivityType } from 'src/types/Types';

export const useTerminal = () => {
  const { instance, ref: xtermRef } = useXTerm({ options: XtermAdapterConfig });
  const { handleCommand } = useCommand();
  const wpmCalculator = useWPMCalculator();
  const commandLine = useComputed(()=> commandLineSignal.value)

  const fitAddon = useRef(new FitAddon());
  const PROMPT = '> ';
  const promptLength = PROMPT.length;

  const writeToTerminal = useCallback((data: string) => {
    instance?.write(data);
  }, [instance]);

  const getCurrentCommand = useCallback(() => {
    if (!instance) return '';
    const buffer = instance.buffer.active;
    let command = '';
    for (let i = 0; i <= buffer.cursorY; i++) {
      const line = buffer.getLine(i);
      if (line) {
        command += line.translateToString(true);
      }
    }
    const promptEndIndex = command.indexOf(PROMPT) + promptLength;
    return command.substring(promptEndIndex).trimStart();
  }, [instance]);

  const resetPrompt = useCallback(() => {
    if (!instance) return;
    instance.reset();
    setCommandLine('');
    instance.write(PROMPT);
    instance.scrollToBottom();
  }, [instance]);

  useEffect(() =>{
    if(!instance) return;
    instance.loadAddon(fitAddon.current);
    fitAddon.current.fit();
    resetPrompt();
  }, [instance])

  useEffect(() => {
    if (!instance) return;

    const handleData = (data: string) => {
      if (!instance) return;
      const cursorX = instance.buffer.active.cursorX;
      if (data === '\x03') { // Handle Ctrl+C
        // Cancel game and tutorial
        setCommandLine('');
        setActivity(ActivityType.NORMAL);
        instance.write('^C');
        resetPrompt();
        return;
      }
      if (data === '\r') { // Enter key
        const currentCommand = getCurrentCommand();
        instance.write('\r\n');
        setCommandLine('');
        handleCommand(currentCommand === '' ? '\r': currentCommand);
        resetPrompt();
        wpmCalculator.clearKeystrokes();
      } else if (data === '\x7F') { // Backspace
        if (cursorX > promptLength) {
          instance.write('\b \b');
          setCommandLine(commandLine.value.slice(0, -1));
        }
      } else if (data === '\x1b[D') { // Left arrow
        if (cursorX > promptLength) {
          instance.write(data);
        }
      } else {
        const newCommandLine = commandLine.value + data;
        instance.write(data);
        setCommandLine(newCommandLine);
        addKeystroke(data);
      }
    }
    const resizeHandler = () => { fitAddon.current.fit(); instance.scrollToBottom(); };
    window.addEventListener('resize', resizeHandler);

    const dataHandler = instance.onData(handleData);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      dataHandler.dispose();
    };
}, [instance, getCurrentCommand, resetPrompt, wpmCalculator, commandLine, setCommandLine]);

  return {
    xtermRef,
    writeToTerminal,
    resetPrompt,
  };
};
