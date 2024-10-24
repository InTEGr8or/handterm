import { TerminalCssClasses } from "../types/TerminalTypes";

import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import Timer from './Timer'; // Import the React component
import ErrorDisplay from "./ErrorDisplay";
import { Phrase } from "../utils/Phrase";
import { commandLineSignal } from "src/signals/commandLineSignals";
import { useComputed, useSignalEffect } from "@preact/signals-react";
import { gamePhraseSignal, setCompletedGamePhrase } from "src/signals/gameSignals";
import { GamePhrase } from "src/types/Types";
import { useLocation } from "react-router-dom";
import GamePhrases from "src/utils/GamePhrases";
import { useReactiveLocation } from "src/hooks/useReactiveLocation";

export interface INextCharsDisplayProps {
    isInPhraseMode: boolean;
    onPhraseSuccess: (phrase: GamePhrase | null) => void;
    onError: (error: number | undefined) => void;
}

export interface NextCharsDisplayHandle {
    resetTimer: () => void;
    cancelTimer: () => void;
}

const NextCharsDisplay = React.forwardRef<NextCharsDisplayHandle, INextCharsDisplayProps>(({
    isInPhraseMode,
    onPhraseSuccess,
    onError
}, ref) => {
    useImperativeHandle(ref, () => ({
        resetTimer,
        cancelTimer
    }));

    const [mismatchedChar, setMismatchedChar] = useState<string | null>(null);
    const [mismatchedIsVisible, setMismatchedIsVisible] = useState(false);
    const [nextChars, setNextChars] = useState<string>('');
    const [phrase, setPhrase] = useState<Phrase>(new Phrase(['']));
    const [gamePhrase, setGamePhrase] = useState<GamePhrase | null>(null);

    const nextCharsRef = useRef<HTMLPreElement>(null);
    const nextCharsRateRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<any>(null);
    const wpmRef = useRef<HTMLSpanElement>(null);
    const commandLine = useComputed(() => commandLineSignal.value);
    const { parseLocation } = useReactiveLocation();

    useEffect(() => {
        if (!parseLocation().activityKey || !parseLocation().contentKey) return;
        const foundPhrase = GamePhrases.getGamePhraseByKey(parseLocation().contentKey ?? '');
        if (!foundPhrase) return;
        setGamePhrase(foundPhrase);
        setPhrase(new Phrase(foundPhrase.value.split('')));
        setNextChars(foundPhrase.value);
    }, [window.location.pathname]);

    useSignalEffect(() => {
        // every time the command line changes.
        handleCommandLineChange(commandLine.value);
    });

    const handleCommandLineChange = (stringBeingTested: string) => {
        startOrContinueTimer();

        const nextIndex = getFirstNonMatchingChar(stringBeingTested);
        if (nextIndex < 0) {
            return null;
        }

        if (nextIndex > phrase.value.length) {
            return null;
        }

        const nextChordHTML = phrase.chordsHTML[nextIndex] as HTMLElement;

        if (nextChordHTML) {
            nextChordHTML.classList.remove("error");
        }

        if (stringBeingTested.length === 0) {
            cancelTimer();
            return;
        }

        if (stringBeingTested === phrase.value.join('').trim().substring(0, stringBeingTested.length)) {
            hideError();
        } else {
            const firstNonMatchingChar = getFirstNonMatchingChar(stringBeingTested);
            const mismatchedChar = phrase.value[firstNonMatchingChar];
            setMismatchedIsVisible(true);
            setMismatchedChar(mismatchedChar);
            showError(mismatchedChar, firstNonMatchingChar);
        }

        if (stringBeingTested.trim() === phrase.value.join('').trim()) {
            stopTimer();
            handleSuccess();
            return;
        }

        const nextCharactersString = getNextCharacters(stringBeingTested);
        // TODO: figure out a better way to handle initial value.
        setNextChars(nextCharactersString);
    };

    const getNextCharacters = (stringBeingTested: string): string => {
        const nextIndex = getFirstNonMatchingChar(stringBeingTested);
        const result = phrase.value.join('').substring(nextIndex);
        return result;
    };

    const getFirstNonMatchingChar = (stringBeingTested: string): number => {
        if (!phrase.value) return 0;
        const sourcePhrase = phrase.value;
        const sourcePhraseString = sourcePhrase.join('');
        if (stringBeingTested === sourcePhraseString) return sourcePhraseString.length;
        if (!stringBeingTested || stringBeingTested.length === 0) {
            return 0;
        }
        let result = 0;
        for (let i = 0; i < stringBeingTested.length; i++) {
            if (stringBeingTested[i] !== sourcePhrase[i]) {
                return i;
            }
            result++;
        }
        return result;
    };


    const showError = (char: string, charIndex: number) => {
        setMismatchedChar(char);
        setMismatchedIsVisible(true);
        onError(charIndex);
    };

    const hideError = () => {
        setMismatchedChar(null);
        setMismatchedIsVisible(false);
        onError(undefined);
    };

    const handleSuccess = () => {
        setMismatchedChar('');
        setMismatchedIsVisible(false);
        setNextChars('');
        if (gamePhrase && gamePhrase.key) setCompletedGamePhrase(gamePhrase.key)
        onPhraseSuccess(gamePhrase);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            timerRef.current.stop();
        }
    };

    const startOrContinueTimer = () => {
        if (timerRef.current) {
            timerRef.current.start();
        }
    };

    const resetTimer = () => {
        if (timerRef.current) {
            timerRef.current.reset();
        }
    };

    const cancelTimer = () => {
        if (timerRef.current) {
            timerRef.current.reset();
        }
        if (nextCharsRef.current) nextCharsRef.current.innerText = phrase.value.join('');
    };

    return (
        (parseLocation().contentKey &&
            <div
                id={TerminalCssClasses.NextChars}
                hidden={!isInPhraseMode}
            >
                {mismatchedChar && mismatchedIsVisible && (
                    <ErrorDisplay
                        isVisible={mismatchedIsVisible}
                        mismatchedChar={mismatchedChar ?? ''}
                    />
                )}
                <Timer ref={timerRef} />
                <div id={TerminalCssClasses.NextCharsRate} ref={nextCharsRateRef}></div>
                <span id={TerminalCssClasses.WPM} ref={wpmRef}></span>
                <pre id={TerminalCssClasses.NextChars} ref={nextCharsRef}>
                    {nextChars}
                </pre>
            </div>
        )
    );
});

export default NextCharsDisplay;
