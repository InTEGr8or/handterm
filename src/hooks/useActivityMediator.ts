import { useState, useCallback, useRef, useEffect } from 'react';
import { Tutorial, ActivityType, ParsedCommand, GamePhrase } from '../types/Types';
import { ActionType } from '../game/types/ActionTypes';
import GamePhrases from '../utils/GamePhrases';
import { useTutorial } from './useTutorials';
import { setNextTutorial, canUnlockTutorial, resetCompletedTutorials, tutorialSignal, getNextTutorial, setCompletedTutorial } from 'src/signals/tutorialSignals';
import {
  initializeGame,
} from 'src/signals/gameSignals';
import { setActivity, activitySignal, setNotification } from 'src/signals/appSignals'
import { useComputed } from '@preact/signals-react';
import { setGamePhrase } from 'src/signals/gameSignals';

export type IActivityMediatorReturn = {
  isInGameMode: boolean;
  isInTutorial: boolean;
  isInEdit: boolean;
  isInNormal: boolean;
  heroAction: ActionType;
  zombie4Action: ActionType;
  handleCommandExecuted: (parsedCommand: ParsedCommand) => boolean;
  setHeroAction: React.Dispatch<React.SetStateAction<ActionType>>,
  setZombie4Action: React.Dispatch<React.SetStateAction<ActionType>>;
  checkTutorialProgress: (command: string | null) => void;
  checkGameProgress: (successPhrase: GamePhrase) => void;
}


export interface IActivityMediatorProps {
}

export function useActivityMediator(props: IActivityMediatorProps): IActivityMediatorReturn {
  const [heroAction, setHeroAction] = useState<ActionType>('Idle');
  const [zombie4Action, setZombie4Action] = useState<ActionType>('Walk');
  const {
    getIncompleteTutorialsInGroup
  } = useTutorial();
  const activity = useComputed(() => activitySignal.value).value;

  const determineActivityState = useCallback((commandActivity: ActivityType | null = null) => {
    /*
      If the user is new to the site, start the tutorial.
      If the user was in tutorial and completed an achievement that has accompanying game levels, start game play.
      Otherwise, just obey the command.
    */

    if (tutorialSignal.value && !tutorialSignal.value?.tutorialGroup && activity !== ActivityType.GAME){
      setActivity(ActivityType.TUTORIAL);
      return;
    }

    if (commandActivity && commandActivity !== activity) {
      setActivity(commandActivity);
      if (commandActivity === ActivityType.GAME) {
        //TODO: how do we know the tutorial has a tutorial group in this case?
        initializeGame(tutorialSignal.value?.tutorialGroup);
      }
      return commandActivity;
    }

    if (tutorialSignal.value?.tutorialGroup && activity !== ActivityType.GAME) {
      initializeGame(tutorialSignal.value.tutorialGroup);
      return ActivityType.GAME;
    }

    return activity;
  }, [activity, tutorialSignal, setActivity]);

  const handleCommandExecuted = useCallback((parsedCommand: ParsedCommand): boolean => {
    let result = false;
    switch (parsedCommand.command) {
      case 'play':
        determineActivityState(ActivityType.GAME);
        result = true;
        break;
      case 'tut':
        if ('r' in parsedCommand.switches) {
          resetCompletedTutorials();
        }
        determineActivityState(ActivityType.TUTORIAL);
        result = true;
        break;
      case 'edit':
        determineActivityState(ActivityType.EDIT);
        result = true;
        break;
      default:
        result = false;
    }
    return result;
  }, [determineActivityState]);

  useEffect(() => {
    determineActivityState(null);
  }, [determineActivityState]);

  const checkTutorialProgress = (
    command: string | null,
  ) => {
    /*
      If args include 'r', reset the tutorial and set TUTORIAL
      If the current tutorial achievement contains a tutorialGroupPhrase, then switch to GAME
      If there is a next tutorial achievement, stay in TUTORIAL
      If neither is true, return to NORMAL
    */

    // If the current tutorial has attached GamePhrases.
    // Don't unlock until the game is played.
    if (!tutorialSignal.value) return;
    console.log("activity:", ActivityType[activitySignal.value], "tutorial:", tutorialSignal.value?.phrase);
    const canUnlock = command ? canUnlockTutorial(command) : false;
    if (canUnlock) {
      if (tutorialSignal.value?.tutorialGroup) {
        console.log(`Tutorial ${tutorialSignal.value.phrase.join('')} CAN BE unlocked after ${tutorialSignal.value.tutorialGroup}`);
        // Will only be unlocked in checkGameProgress.
        initializeGame(tutorialSignal.value.tutorialGroup);
        return;
      }
      setCompletedTutorial(tutorialSignal.value.phrase.join(''))
    }
    else {
      console.log(`Tutorial ${tutorialSignal.value} not unlocked with ${command}`);
      setNotification(`Tutorial ${tutorialSignal.value} not unlocked with ${command}`)
      return;
    }
    // TODO: if the tutorial is not completed until the tutorialGroup is completed, how do we know if the tutorialGroup is completed, and which tutorial to complete when it is completed?
    const nextTutorial = getNextTutorial();
    console.log("nextTutorial:", nextTutorial?.phrase.join(''));
    if (nextTutorial) {
      determineActivityState(ActivityType.TUTORIAL);
      setNextTutorial();
      return;
    }
    setActivity(ActivityType.GAME);
    return;
  };

  const checkGameProgress = (successPhrase: GamePhrase) => {
    // Called after phrase completion.
    if (successPhrase?.tutorialGroup) {
      //TODO: isComplete is IMMUTABLE in the JSON file. THis is not a list of incomplete phrases.
      const incompletePhrasesInGroup = GamePhrases.getIncompletePhrasesByTutorialGroup(successPhrase.tutorialGroup);
      if (incompletePhrasesInGroup.length > 0) {
        // Set the next phrase
        setGamePhrase(incompletePhrasesInGroup[0]);
        setActivity(ActivityType.GAME);
        return;
      }
      //TODO: Set Tutorial completed
      const incompleteTutorialInGroup = getIncompleteTutorialsInGroup(successPhrase.tutorialGroup);
      incompleteTutorialInGroup.forEach(itig => {
        setCompletedTutorial(itig.phrase.join(''))
      });
    }

    const nextTutorial = getNextTutorial();
    if ((setNextTutorial())) {
      setActivity(ActivityType.TUTORIAL);
      return;
    }

    const nextGamePhrase = GamePhrases.getGamePhrasesNotAchieved()[0];
    if (nextGamePhrase) {
      // Set next phrase
      setGamePhrase(nextGamePhrase);
      setActivity(ActivityType.GAME);
      return;
    }
    setActivity(ActivityType.NORMAL);
  };

  return {
    isInGameMode: activity === ActivityType.GAME,
    isInTutorial: activity === ActivityType.TUTORIAL,
    isInEdit: activity === ActivityType.EDIT,
    isInNormal: activity === ActivityType.NORMAL,
    checkTutorialProgress,
    heroAction,
    zombie4Action,
    handleCommandExecuted,
    setHeroAction,
    setZombie4Action,
    checkGameProgress,
  };
}
