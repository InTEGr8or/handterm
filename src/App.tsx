// App.tsx
import React, { useEffect, useRef } from 'react';
import  HandTerm  from './components/HandTerm';
import { CommandProvider } from './commands/CommandProvider';
import { TerminalCssClasses } from './types/TerminalTypes';
import { useAuth } from './lib/useAuth';

const App = () => {
  const containerRef = React.createRef<HTMLDivElement>();
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const handexTermRef = useRef<HandTerm>(null);
  const auth = useAuth();

  useEffect(() => {
    const w = getContainerWidth();
    setContainerWidth(w);

    const handleClickOutsideTerminal = (event: UIEvent) => {
      // Check if the click is outside of the terminal area
      if (
        handexTermRef.current &&
        handexTermRef.current.adapterRef.current
        && (event.target as HTMLElement).id !== TerminalCssClasses.Terminal
      ) {
        event.stopPropagation();
        // window.scrollTo(0, window.screen.height)
        handexTermRef.current.adapterRef.current.focusTerminal();

        if (event instanceof MouseEvent || (event instanceof TouchEvent && event.touches.length === 1)) {
          setTimeout(() => {
            handexTermRef.current?.adapterRef.current?.focusTerminal();
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
    };
  }, [])

  const getContainerWidth = () => {
    return containerRef.current?.clientWidth ?? 0
  }

  useEffect(() => {
    const handleResize = () => {
      const w = getContainerWidth();
      setContainerWidth(w);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  })

  return (
    <CommandProvider handTermRef={handexTermRef}>
      <div ref={containerRef}>
        <HandTerm
          ref={handexTermRef}
          auth={auth}
          terminalWidth={containerWidth}
        />
      </div>
    </CommandProvider>
  );
};

export default App;