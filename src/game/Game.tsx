// TerminalGame.ts
import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import { Zombie4 } from './Zombie4';
import { Hero } from './Hero';
import { Action, ActionType } from './types/ActionTypes';
import { SpritePosition } from './types/Position';
import { layers, getLevelCount } from './Level';
import { Sprite } from './sprites/Sprite';
import { IParallaxLayer, ParallaxLayer } from './ParallaxLayer';
import ScrollingTextLayer from './ScrollingTextLayer';
import confetti from 'canvas-confetti';
import { PhraseType } from 'src/utils/Phrases';

export interface IGameProps {
  canvasHeight: number
  canvasWidth: number
  isInGameMode: boolean
  heroActionType: ActionType
  zombie4ActionType: ActionType
  zombie4StartPosition: SpritePosition
  onSetHeroAction: (action: ActionType) => void;
  onSetZombie4Action: (action: ActionType) => void;
  tutorialGroupPhrases: PhraseType[];
}

export interface IGameHandle {
  startGame: () => void;
  completeGame: () => void;
  resetGame: () => void;
  levelUp: (setLevelValue?: number | null) => void;
  handleZombie4PositionChange: (position: SpritePosition) => void;
}

interface ICharacterRefMethods {
  getCurrentSprite: () => Sprite | null;
  getActions: () => Record<ActionType, Action>;
  draw: (context: CanvasRenderingContext2D, position: SpritePosition) => number;
}

const Game = React.forwardRef<IGameHandle, IGameProps>((props, ref) => {
  const {
    canvasHeight,
    canvasWidth,
    isInGameMode,
    heroActionType,
    zombie4ActionType,
    zombie4StartPosition,
    onSetHeroAction,
    onSetZombie4Action,
  } = props;

  const startGame = () => {
    if (context) {
      startAnimationLoop(context);
    }
    // Reset game state here if needed
    setZombie4Position(zombie4StartPosition);
    setIsPhraseComplete(false);
    // Add any other necessary game start logic
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<ICharacterRefMethods>(null);
  const zombie4Ref = useRef<ICharacterRefMethods>(null);
  const animationFrameIndex = useRef<number | undefined>(undefined);
  const zombie4DeathTimeout = useRef<NodeJS.Timeout | null>(null);
  const heroXPercent = 0.23;

  const [currentLevel, setCurrentLevel] = useState(1);
  const [heroPosition, setHeroPosition] = useState<SpritePosition>({ leftX: canvasWidth * heroXPercent, topY: 30 });
  const [zombie4Position, setZombie4Position] = useState<SpritePosition>(zombie4StartPosition);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [backgroundOffsetX, setBackgroundOffsetX] = useState(0);
  const [isPhraseComplete, setIsPhraseComplete] = useState(false);
  const [isTextScrolling, setIsTextScrolling] = useState(false);
  const textToScroll = "TERMINAL VELOCITY!";
  const [layersState, setLayersState] = useState<IParallaxLayer[]>(layers[0]);

  const getLevel = () => currentLevel;
  const setLevel = (newLevel: number) => {
    const newLayers = layers[newLevel - 1];
    setCurrentLevel(newLevel);
    setLayersState(newLayers);
  };

  const levelUp = (setLevelValue: number | null = null) => {
    const levelCount = getLevelCount();
    if (setLevelValue && setLevelValue > levelCount) setLevelValue = levelCount;
    let nextLevel = setLevelValue || getLevel() + 1;
    if (nextLevel > levelCount) nextLevel = 0;
    if (nextLevel < 1) nextLevel = 1;
    setLevel(nextLevel);
  };

  const setupCanvas = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d');
    if (context) {
      setContext(context);
    } else {
      console.error("Failed to get canvas context.");
    }
  };

  const toggleScrollingText = (show: boolean | null = null) => {
    if (show === null) show = !isTextScrolling;
    setIsTextScrolling(show);
  };

  const drawScrollingText = () => {
    toggleScrollingText(true);
    setTimeout(() => {
      toggleScrollingText(false);
    }, 3000);
  };

  const completeGame = () => {
    setZombie4ToDeathThenResetPosition();
    triggerConfettiCannon();
    setIsPhraseComplete(true);
  };

  const setZombie4ToDeathThenResetPosition = () => {
    if (zombie4DeathTimeout.current) {
      clearTimeout(zombie4DeathTimeout.current);
      zombie4DeathTimeout.current = null;
    }

    setZombie4Action('Death');
    zombie4DeathTimeout.current = setTimeout(() => {
      setZombie4Action('Walk');
      setZombie4Position(zombie4StartPosition);
      setIsPhraseComplete(false);
      zombie4DeathTimeout.current = null;
    }, 3000);
  };

  const checkProximityAndSetAction = () => {
    const ATTACK_THRESHOLD = 100;
    const distance = heroPosition.leftX - zombie4Position.leftX;

    if (20 < distance && distance < ATTACK_THRESHOLD) {
      setZombie4Action('Attack');
      if (distance < 50) {
        setHeroAction('Hurt');
      }
      if (distance < 30) {
        setHeroAction('Death');
      }
    } else {
      if (zombie4ActionType === 'Attack') {
        setZombie4Action('Walk');
      }
    }
  };

  const setZombie4Action = (action: ActionType) => {
    onSetZombie4Action(action);
  };

  const setHeroAction = (action: ActionType) => {
    onSetHeroAction(action);
  };

  const updateCharacterAndBackgroundPostion = (_context: CanvasRenderingContext2D): number => {
    const canvasCenterX = canvasWidth * heroXPercent;
    const characterReachThreshold = canvasCenterX;

    _context.clearRect(0, 0, canvasWidth, canvasHeight);

    let heroDx = 0;
    if (heroRef.current && _context) {
      heroDx = heroRef.current.draw(_context, heroPosition);
    }

    if (zombie4Ref.current && _context) {
      const zombie4Dx = zombie4Ref.current.draw(_context, zombie4Position);
      setZombie4Position(prev => ({
        ...prev, leftX: prev.leftX + zombie4Dx
      }));
    }

    if (heroDx !== 0) {
      setBackgroundOffsetX(prev => prev + heroDx);

      if (heroPosition.leftX >= characterReachThreshold) {
        setHeroPosition(prev => ({ ...prev, leftX: characterReachThreshold }));
      }

      const newZombie4PositionX = zombie4Position.leftX - heroDx;
      setZombie4Position(prev => ({ ...prev, leftX: newZombie4PositionX }));
    }
    return heroDx;
  };

  const startAnimationLoop = (context: CanvasRenderingContext2D) => {
    const frameDelay = 150;
    let lastFrameTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const deltaTime = now - lastFrameTime;

      if (deltaTime >= frameDelay) {
        lastFrameTime = now - (deltaTime % frameDelay);

        if (isPhraseComplete) {
          drawScrollingText();
        }

        updateCharacterAndBackgroundPostion(context);
        checkProximityAndSetAction();
      }
      animationFrameIndex.current = requestAnimationFrame(loop);
    };

    animationFrameIndex.current = requestAnimationFrame(loop);
  };

  const stopAnimationLoop = () => {
    if (animationFrameIndex.current) {
      cancelAnimationFrame(animationFrameIndex.current);
      animationFrameIndex.current = undefined;
    }
  };

  const triggerConfettiCannon = () => {
    confetti({
      zIndex: 3,
      angle: 160,
      spread: 45,
      startVelocity: 45,
      particleCount: 150,
      origin: { x: 0.99, y: 0.8 }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      setupCanvas(canvas);
    }

    return () => {
      stopAnimationLoop();
      if (zombie4DeathTimeout.current) {
        clearTimeout(zombie4DeathTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (context) {
      startAnimationLoop(context);
    }
  }, [context]);

  useImperativeHandle(ref, () => ({
    startGame,
    completeGame,
    resetGame: () => {
      setZombie4Position(zombie4StartPosition);
      setIsPhraseComplete(false);
    },
    levelUp,
    handleZombie4PositionChange: (position: SpritePosition) => {
      setZombie4Position(position);
    },
  }));

  return (
    <>
      {isInGameMode ? (
        <div
          id="terminal-game"
          style={{ position: "relative", height: canvasHeight }}
        >
          <div className="parallax-background">
            {isTextScrolling && (
              <ScrollingTextLayer
                text={textToScroll}
                canvasHeight={canvasHeight}
              />
            )}
            {layersState.map((layer, index) => (
              <ParallaxLayer
                key={index}
                layer={layer}
                offset={backgroundOffsetX}
                canvasHeight={canvasHeight}
              />
            ))}
          </div>
          <canvas
            style={{ position: "absolute", top: 0, left: 0, zIndex: 2 }}
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
          />
          <Hero
            ref={heroRef}
            currentActionType={heroActionType}
            scale={1.95}
          />
          <Zombie4
            ref={zombie4Ref}
            currentActionType={zombie4ActionType}
            scale={1.90}
          />
        </div>
      ) : null}
    </>
  );
});

export default Game;
