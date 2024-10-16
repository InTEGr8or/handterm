// App.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OutputElement } from './types/Types';
import { HandTermWrapper, IHandTermWrapperMethods } from './components/HandTermWrapper';
import { TerminalCssClasses } from './types/TerminalTypes';
import { useAuth } from './lib/useAuth';
import { Output } from './components/Output';
import { AppProvider } from './contexts/AppContext';
import { CommandProvider } from './contexts/CommandProvider';
import { ActivityMediatorProvider } from './contexts/ActivityMediatorContext';

// const MemoizedOutput = React.memo(Output);

export default function App () {
  const containerRef = React.createRef<HTMLDivElement>();
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  const auth = useAuth();
  const handexTermWrapperRef = useRef<IHandTermWrapperMethods>(null);

  const getContainerWidth = () => {
    return containerRef.current?.clientWidth ?? 0
  }

  let output: OutputElement[] = [];
  useEffect(() => {
    const handleResize = () => {
      const w = getContainerWidth();
      setContainerWidth(w);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOutputUpdate = useCallback((newOutput: OutputElement) => {
    // setOutputElements((prevOutputs: OutputElement[]) => [...prevOutputs, newOutput]);
  }, []);

  const handleTouchStart = useCallback(() => {
    // Implement your touch start logic here
    console.log("handling touch start");
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Implement your touch end logic here
    console.log("Handling touch end");
  }, []);
  useEffect(() => {
    const w = getContainerWidth();
    setContainerWidth(w);

    const handleClickOutsideTerminal = (event: UIEvent) => {
      // Check if the click is outside of the terminal area
      if (
        handexTermWrapperRef.current &&
        (event.target as HTMLElement).id !== TerminalCssClasses.Terminal
      ) {
        event.stopPropagation();
        handexTermWrapperRef.current.focusTerminal();

        if (event instanceof MouseEvent || (event instanceof TouchEvent && event.touches.length === 1)) {
          setTimeout(() => {
            handexTermWrapperRef.current?.focusTerminal();
          }, 1000);
        }
      }
    };

    // Attach the event listener to the document body
    document.body.addEventListener('click', handleClickOutsideTerminal);
    document.body.addEventListener('touchstart', handleClickOutsideTerminal);

    // Clean up the event listener
    return () => {
      document.body.removeEventListener('click', handleClickOutsideTerminal);
      document.body.removeEventListener('touchstart', handleClickOutsideTerminal);
    };
  }, []);

  return (
    <ActivityMediatorProvider>
      <div ref={containerRef}>
        <AppProvider>
          <CommandProvider
            auth={auth}
            handTermRef={handexTermWrapperRef}
          >
            <Output />
            <HandTermWrapper
              ref={handexTermWrapperRef}
              auth={auth}
              terminalWidth={containerWidth}
              onOutputUpdate={handleOutputUpdate}
            />
          </CommandProvider>
        </AppProvider>
      </div>
    </ActivityMediatorProvider>

  );
};
