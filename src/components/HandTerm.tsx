/** @jsxImportSource react */
import { LogKeys, CharDuration, CharWPM, TerminalCssClasses } from '../types/TerminalTypes';
import * as ReactDOMServer from 'react-dom/server';
import HelpCommand from '../commands/HelpCommand';
import SpecialCommand from '../commands/SpecialCommand';
import WpmTable from './WpmTable';
import { IWPMCalculator, WPMCalculator } from '../utils/WPMCalculator';
import { IPersistence, LocalStoragePersistence } from '../Persistence';
import { createHTMLElementFromHTML } from '../utils/dom';
import * as React from 'react';
import { ContextType, TouchEventHandler } from 'react';
import XtermAdapter, { XtermAdapterHandle } from './XtermAdapter';
import NextCharsDisplay, { NextCharsDisplayHandle } from './NextCharsDisplay';
import { Output } from './Output';
import Game from '../game/Game';
import { ActionType } from '../game/types/ActionTypes';
import WebCam from '../utils/WebCam';
import { CommandContext } from '../commands/CommandContext';
import { MyResponse } from '../types/Types';
import { TutorialComponent } from './TutorialComponent';
import { Chord } from './Chord';
import { SpritePosition } from '../game/types/Position';
import MonacoEditor, { MonacoEditorHandle } from './MonacoEditor';
import './MonacoEditor.css'; // Make sure to import the CSS
import { loadCommandHistory, parseCommand } from '../utils/commandUtils';
import { getNextTutorialAchievement, loadTutorialAchievements } from '../utils/achievementUtils';
import UnlockAchievement from '../commands/UnlockAchievement';
import { Prompt } from './Prompt';
import { createTimeCode } from '../utils/timeUtils';
import { TimeDisplay } from './TimeDisplay';
import { useCommandHistory } from '../hooks/useCommandHistory';
import { useActivityMediator, ActivityType } from '../hooks/useActivityMediator';
// import HelpCommand from '../commands/HelpCommand';
// import SpecialCommand from '../commands/SpecialCommand';
import Phrases from '../utils/Phrases';

export interface IHandTermMethods {
   writeOutput: (output: string) => void;
   prompt: () => void;
   terminalReset: () => void;
   saveCommandResponseHistory: (command: string, response: string, status: number) => string;
   adapterRef: React.RefObject<XtermAdapterHandle>;
   focusTerminal: () => void;
   handleCommand: (cmd: string) => void;
   handleCharacter: (character: string) => void;
   toggleVideo: () => boolean;
   // Add other methods as needed
}

export type HandTermRef = React.RefObject<IHandTermMethods>;

export interface IHandTermProps {
  // Define the interface for your HandexTerm logic
  terminalWidth: number;
  auth: {
    login: (username: string, password: string) => Promise<MyResponse<any>>;
    logout: () => void;
    isLoggedIn: boolean;
    setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
    signUp: (
      username: string,
      password: string,
      email: string,
      callback: (error: any, result: any) => void
    ) => void;
    verify: (username: string, code: string, callback: (error: any, result: any) => void) => void;
    getUser: () => Promise<MyResponse<any>>;
    setUser: (profile: string) => void;
    saveLog: (key: string, content: string, extension: string) => Promise<MyResponse<any>>;
    getLog: (key: string, limit?: number) => Promise<MyResponse<any>>;
    changePassword: (
      oldPassword: string,
      newPassword: string,
      callback: (error: any, result: any) => void
    ) => void;
    getFile: (key: string, extension: string) => Promise<MyResponse<any>>;
    putFile: (key: string, content: string, extension: string) => Promise<MyResponse<any>>;
    listLog: () => Promise<MyResponse<any>>;
    getExpiresAt: () => string | null;
    refreshTokenIfNeeded: () => Promise<MyResponse<any>>;
    initiateGitHubAuth: () => void;
    listRecentRepos: () => Promise<MyResponse<any>>;
    getRepoTree: (repo: string, path?: string) => Promise<MyResponse<any>>;
    // Add other properties returned by useAuth here
  };
  commandHistoryHook?: ReturnType<typeof useCommandHistory>;
  activityMediator?: ReturnType<typeof useActivityMediator>;
}

type LanguageType = "javascript" | "typescript" | "markdown";

export interface IHandTermState {
  // Define the interface for your HandexTerm state
  phraseValue: string;
  phraseName: string;
  phraseIndex: number;
  phrasesAchieved: string[];
  targetWPM: number;
  isActive: boolean;
  commandLine: string;
  terminalSize: { width: number; height: number } | undefined;
  terminalFontSize: number;
  canvasHeight: number;
  unlockedAchievements: string[];
  isInSvgMode: boolean;
  lastTypedCharacter: string | null;
  errorCharIndex: number | undefined;
  editContent: string;
  editMode: boolean;
  editLanguage: LanguageType;
  editFilePath: string;
  editFileExtension: string;
  isShowVideo: boolean;
  githubAuthHandled: boolean;
  githubUsername: string | null;
  userName: string | null;
  domain: string;
  timestamp: string;
  commandHistory: string[];
  commandHistoryIndex: number;
  commandHistoryFilter: string | null;
  outputElements: React.ReactNode[];
}

// @ts-ignore
// @ts-ignore
class HandTerm extends React.Component<IHandTermProps, IHandTermState> implements IHandTermMethods {
  static contextType = CommandContext;
  declare context: ContextType<typeof CommandContext>;
  declare props: IHandTermProps;
  state: IHandTermState;
  declare setState: React.Component['setState'];

  private terminalElementRef = React.createRef<HTMLDivElement>();
  public adapterRef = React.createRef<XtermAdapterHandle>();
  private nextCharsDisplayRef: React.RefObject<NextCharsDisplayHandle> = React.createRef();
  private editorRef: React.RefObject<MonacoEditorHandle> = React.createRef();
  outputRef = React.createRef<HTMLDivElement>();

  private heroRunTimeoutId: number | null = null;
  private heroSummersaultTimeoutId: number | null = null;
  private heroActionTimeoutId: number | null = null;

  private _persistence!: IPersistence;
  private wpmCalculator: IWPMCalculator = new WPMCalculator();
  private isDebug: boolean = false;
  private lastTouchDistance: number | null = null;
  private currentFontSize: number = 17;
  private inLoginProcess: boolean = false;
  private tempUserName: string = '';
  private tempNewPassword: string = '';
  private isInChangePasswordMode: boolean = false;
  private zombie4StartPostion: SpritePosition = { leftX: -50, topY: 0 }
  private setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;

  private commandHistoryHook: ReturnType<typeof useCommandHistory>;
  private activityMediator: ReturnType<typeof useActivityMediator>;

  constructor(props: IHandTermProps) {
    super(props);
    this.setIsLoggedIn = props.auth.setIsLoggedIn;
    this._persistence = new LocalStoragePersistence();
    const initialCanvasHeight = localStorage.getItem('canvasHeight') || '100';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    this.commandHistoryHook = props.commandHistoryHook || { 
      commandHistory: [], 
      commandHistoryIndex: -1, 
      commandHistoryFilter: null,
      addToCommandHistory: () => {},
      getCommandResponseHistory: () => [],
      setCommandHistoryIndex: () => {},
      setCommandHistoryFilter: () => {}
    };

    this.activityMediator = props.activityMediator || { 
      currentActivity: ActivityType.TUTORIAL,
      isInGameMode: false,
      isInTutorial: false,
      isInEdit: false,
      achievement: { phrase: [], prompt: '', unlocked: false },
      heroAction: 'Idle' as ActionType,
      zombie4Action: 'Walk' as ActionType,
      gameHandleRef: { current: null },
      handleCommand: () => false,
      setNextAchievement: () => {},
      setHeroAction: () => {},
      setZombie4Action: () => {},
    };
    
    this.state = {
      domain: 'handterm.com',
      userName: isLoggedIn ? localStorage.getItem(LogKeys.Username) || null : null,
      timestamp: new Date().toTimeString().split('(')[0],
      outputElements: this.commandHistoryHook.getCommandResponseHistory().slice(-1),
      phraseValue: '',
      phraseName: '',
      phraseIndex: 0,
      phrasesAchieved: Phrases.getPhrasesAchieved()
        .map((phrase: { wpm: number; phraseName: string }) => phrase.phraseName),
      targetWPM: this.loadTargetWPM(),
      isActive: false,
      commandLine: '',
      terminalSize: undefined,
      terminalFontSize: 17,
      canvasHeight: parseInt(initialCanvasHeight),
      unlockedAchievements: loadTutorialAchievements(),
      isInSvgMode: false,
      lastTypedCharacter: null,
      errorCharIndex: undefined,
      editContent: '',
      editMode: false,
      editLanguage: "markdown",
      editFilePath: "_index",
      editFileExtension: "md",
      isShowVideo: false,
      githubAuthHandled: false,
      githubUsername: isLoggedIn ? localStorage.getItem(LogKeys.GitHubUsername) || null : null,
      commandHistory: this.commandHistoryHook.commandHistory,
      commandHistoryIndex: this.commandHistoryHook.commandHistoryIndex,
      commandHistoryFilter: this.commandHistoryHook.commandHistoryFilter,
    }
    this.loadDebugValue();
    this.loadFontSize();
  }

  private handleGitHubAuth = () => {
    if (!this.state.githubAuthHandled) {
      const urlParams = new URLSearchParams(window.location.search);
      const githubAuth = urlParams.get('githubAuth');
      const githubUsername = urlParams.get('githubUsername');
      if (!githubUsername) return;
      if (githubAuth === 'success') {
        localStorage.setItem('githubUsername', githubUsername);
        window.history.replaceState({}, document.title, window.location.pathname);
        this.writeOutput(`GitHub authentication successful. Welcome, ${githubUsername}!`);
        this.setState({
          githubAuthHandled: true,
          githubUsername: githubUsername
        });
      }
    }
  }

  public handlePhraseErrorState = (errorIndex: number | undefined) => {
    this.setState({ errorCharIndex: errorIndex });
  };

  handleRemoveCharacter = (command: string) => {
    if (command.length === 0) {
      this.nextCharsDisplayRef.current?.resetTimer();
    }
    if (this.activityMediator.isInGameMode) {
      this.setState({
        commandLine: command,
      });
    }
  }

  handleEditChange = (content: string) => {
    this.setState({ editContent: content });
    localStorage.setItem('editContent', content);
  };

  handleEditSave = (content: string) => {
    this.props.auth.putFile(
      this.state.editFilePath,
      content,
      this.state.editFileExtension || 'md'
    ).catch((error) => {
      this.writeOutput(`Error saving file: ${error.message}`);
    });
    this.writeOutput(content || '');
  }

  handleEditorClose = () => {
    this.setState({ editMode: false }, () => {
      setTimeout(() => {
        this.focusTerminal();
      }, 100);
    });
  }

  resetTutorialAchievementState() {
    localStorage.removeItem('achievements');
    this.setState({
      unlockedAchievements: [],
      
    });
    const nextAchievement = getNextTutorialAchievement();
    if (nextAchievement) {
      this.activityMediator.setNextAchievement(nextAchievement);
    }
  }

  public focusTerminal() {
    if (this.adapterRef.current) {
      this.adapterRef.current.focusTerminal();
    }
  }

  private savePhrasesAchieved(phraseName: string, wpmAverage: number) {
    const wpmPhraseName = Math.round(wpmAverage) + ':' + phraseName;
    const matchingPhrases = this.state.phrasesAchieved
      .filter(p => { return p.split(":")[1] === this.state.phraseName });
    if (matchingPhrases.length > 0) return;
    this.setState((prevState: IHandTermState) => ({
      phrasesAchieved: [...(prevState.phrasesAchieved || []), wpmPhraseName]
    }))

    const storedPhrasesAchievedString: string = localStorage.getItem('phrasesAchieved') || '';
    let storedPhrasesAchieved = storedPhrasesAchievedString ? JSON.parse(storedPhrasesAchievedString) : [];
    const matchingStoredPhrases = storedPhrasesAchieved
      .filter((p: string) => { return p.split(":")[1] === this.state.phraseName });
    if (matchingStoredPhrases.length > 0) return;
    storedPhrasesAchieved.push(wpmPhraseName);
    localStorage.setItem('phrasesAchieved', JSON.stringify(storedPhrasesAchieved));
  }

  private loadTargetWPM(): number {
    const storedTargetWPM = localStorage.getItem(LogKeys.TargetWPM);
    return storedTargetWPM ? parseInt(storedTargetWPM) : 25;
  }

  scrollToBottom() {
    if (this.adapterRef.current) {
      this.adapterRef.current.scrollBottom();
    }
  }

  componentDidMount(): void {
    if (this.adapterRef.current) {
      const size = this.adapterRef.current.getTerminalSize();
      if (size) {
        this.setState({ terminalSize: size });
      }
      this.adapterRef.current.terminalWrite(localStorage.getItem('currentCommand') || '');
    }
    this.scrollToBottom();

    this.addTouchListeners();

    this.handleGitHubAuth();
  }

  componentDidUpdate(_prevProps: Readonly<IHandTermProps>, _prevState: Readonly<IHandTermState>, _snapshot?: any): void {
    this.handleGitHubAuth();
  }

  componentWillUnmount(): void {
    if (this.heroRunTimeoutId) {
      clearTimeout(this.heroRunTimeoutId);
    }
    this.removeTouchListeners();
  }

  handleFocusEditor = () => {
    setTimeout(() => {
      if (this.editorRef.current) {
        this.editorRef.current.focus();
      }
    }, 100);
  };

  public handleCommand = (inputCmd: string): void => {
    this.commandHistoryHook.addToCommandHistory(inputCmd);

    let status = 404;
    let response = "Command not found.";

    if (inputCmd === 'tut') {
      if(!this.activityMediator.isInTutorial){
        this.resetTutorialAchievementState();
        this.activityMediator.handleCommand(inputCmd);
      }
      // Unlock the next achievement and decide if we are still in tutorial mode
      UnlockAchievement({
        achievementPhrase: inputCmd,
        nextAchievement: this.activityMediator.achievement,
        unlockedAchievements: this.state.unlockedAchievements,
        setState: (newState: any) => {
          this.setState(newState);
          if (newState.nextAchievement) {
            this.activityMediator.setNextAchievement(newState.nextAchievement);
          }
        }
      });
    }

    const { parsedCommand, args, switches } = parseCommand(inputCmd);

    const handled = this.activityMediator.handleCommand(parsedCommand);
    if (handled) {
      if (parsedCommand === 'play') {
        this.setState({
          phraseIndex: 0,
        });
        if (args.length) {
          this.setNewPhrase(args[0])
        } else {
          const nthPhrase = Phrases.getNthPhraseNotAchieved(this.state.phraseIndex);
          this.setNewPhrase(nthPhrase.value);
        }

        this.activityMediator.gameHandleRef.current?.handleZombie4PositionChange(this.zombie4StartPostion);
      }
      return;
    }


    if (this.context) {
      const output = this.context
        .executeCommand(
          parsedCommand,
          args,
          switches,
        );
      if (output.status === 200) return;
    }
    if (parsedCommand === 'help' || parsedCommand === '411') {
      status = 200;
      response = ReactDOMServer.renderToStaticMarkup(<HelpCommand command={parsedCommand} />);
    }

    if (parsedCommand === 'special') {
      status = 200;
      response = ReactDOMServer.renderToStaticMarkup(<SpecialCommand />);
    }

    if (parsedCommand === 'edit') {
      const expiresAtString = this.props.auth.getExpiresAt();
      if (!expiresAtString) {
        response = "You must login to edit files.";
        this.writeOutput(response);
        status = 401;
        this.setState({ editMode: false });
        this.adapterRef.current?.prompt();
        return;
      }
      response = `Editing ${this.state.editFilePath}.${this.state.editFileExtension}`;
      (async () => {
        const fileContent = await this.props.auth.getFile(
          this.state.editFilePath, this.state.editFileExtension
        );
        this.setState({
          editContent: fileContent.data,
          editMode: true,
        }, () => {
          this.handleFocusEditor();
        });
      })();
    }

    if (parsedCommand === 'target') {
      if (args.length === 0) {
        response = "Target WPM: " + this.state.targetWPM;
      } else {
        const targetWPMString = args[0] || '';
        const targetWPM: number = parseInt(targetWPMString, 10);
        if (!isNaN(targetWPM)) {
          this.setState({ targetWPM: targetWPM });
          localStorage.setItem(LogKeys.TargetWPM, targetWPM.toString());
          // Implement or import resetPhrasesAchieved function
          // For now, let's comment it out
          // resetPhrasesAchieved();
          response = "Target WPM set to " + targetWPM.toString();
        } else {
          response = "Target WPM must be a number";
        }
      }
    }

    if (parsedCommand === 'show') {
      if (args.length === 0) {
        response = Phrases.getPhrasesAchieved().map((phrase: { wpm: number; phraseName: string; }) => `${phrase.wpm}:${phrase.phraseName}`).join('<br/>');
        status = 200;
      }
    }

    if (parsedCommand === 'cat') {
      if (args.length === 0) {
        status = 200;
        const filename = '_index';
        (async () => {
          try {
            const userResponse: any = await this.props.auth.getFile(filename, 'md');

            if (userResponse.status === 200) {
              const content = userResponse.data.content.replaceAll('\n', '<br />');
              this.writeOutput(content);
            } else {
              this.writeOutput(userResponse.error.join('<br/>'));
            }
          } catch (error) {
            console.error("Error fetching user:", error);
          }
        })();
        response = "Getting profile";
      } else {
        const content = args.join(' ');
        this.props.auth.setUser(content);
      }
    }

    if (parsedCommand === 'profile') {
      status = 200;
      this.props.auth.getUser().then((user: any) => {
        this.writeOutput(JSON.stringify(user));
      });
      return;
    }

    if (parsedCommand === 'github') {
      status = 200;
      response = "Opening github.com for you to authenticate there.";
      if (!this.state.githubUsername) {
        this.props.auth.initiateGitHubAuth();
      } else {

        if (args.length === 1) {
          const repo = args[0];
          // TODO: Handle Github file tree
          this.props.auth.getRepoTree(repo).then((tree: any) => {
            const treePathArray = Array.from(tree).map((treeItem: any) => {return treeItem.type === 'tree' ? `${treeItem.path}/` : treeItem.path});
            this.writeOutput(treePathArray.join('<br/>'));
          });

        } else {
          this.props.auth.listRecentRepos().then((repos: any) => {
            console.log("repos: ", repos);
            const repoNames = Array.from(repos).map((repo: any) => repo.name);
            localStorage.setItem(LogKeys.RepoNames, JSON.stringify(repoNames));
            const reponameText = repoNames.join('<br/>');

            console.log("repoNames: ", repoNames);
            this.writeOutput(reponameText);
          });
        }
      }
      return;
    }

    else if (parsedCommand === 'signup') {
      response = "Signing up. Enter <username> <password> <email> (without <>)";
      const commandSlices = parsedCommand.split(' ');
      this.props.auth.signUp(commandSlices[1], commandSlices[2], commandSlices[3], (error, result) => {
        if (error) {
          console.error(error);
          response = "Error signing up." + result;
          status = 500;
        }
        else {
          response = "Sign up successful!" + result;
          status = 200;
        }
        this.writeOutput(response);
      });
      return;
    }
    else if (parsedCommand === 'login') {
      response = "Logging in. Type password. It will be masked with ***";
      this.tempUserName = args[0];
      this.inLoginProcess = true;
      return;
    }
    else if (parsedCommand === 'logout') {
      this.props.auth.logout();
      response = "Logged out successfully.";
      status = 200;
      this.setIsLoggedIn(false);
      this.updateUserName();
    }
    else if (parsedCommand === 'changepassword') {
      response = "Changing password. Enter <old_password> <new_password> (without <>)";
      this.isInChangePasswordMode = true;
      return;
    }
    else if (this.context) {
      const output = this.context.executeCommand(parsedCommand, args, switches);
      if (output.status === 200) {
        response = output.message;
        status = output.status;
      }
    }

    this.activityMediator.gameHandleRef.current?.resetGame();
    this.scrollToBottom();
    this.setState({ commandLine: '' });

    // ... (rest of the existing code)

    // ... (rest of the existing code)

    if (this.nextCharsDisplayRef.current) this.nextCharsDisplayRef.current.cancelTimer();
    if (this.activityMediator.isInGameMode) {
      response = '';
    }

    this.adapterRef.current?.prompt();
    if (parsedCommand === '') return;
    if (parsedCommand.startsWith('debug')) {
      let isDebug = parsedCommand.includes('--true') || parsedCommand.includes('-t');
      this.toggleIsDebug(isDebug);
      return;
    }

    if (inputCmd !== 'Return') this.saveCommandResponseHistory(inputCmd, response, status);
    return;
  }

  public prompt = () => {
    this.adapterRef.current?.prompt();
  }

  public handleCharacter = (character: string) => {
    const charDuration: CharDuration = this.wpmCalculator.addKeystroke(character);
    const currentCommand = this.adapterRef.current?.getCurrentCommand();

    localStorage.setItem(LogKeys.CurrentCommand, currentCommand + character);
    const charCodes: number[] = character.split('').map(char => char.charCodeAt(0));
    if (this.state.isInSvgMode) {
      // TODO: Show last character of current command SVG. Handle backspace and return properly. 
      this.setState({ lastTypedCharacter: character });
    } else {
      this.setState({ lastTypedCharacter: null });
    }
    if (this.inLoginProcess) {
      if (character === '\r') {
        this.inLoginProcess = false;
        // Immediately invoked async function to use await
        (async () => {
          try {
            const result = await this.props.auth.login(this.tempUserName, this.getTempPassword());
            if (result.status === 200) {
              this.writeOutput(`Login successful! Status: ${JSON.stringify(result.status)}`);
              localStorage.setItem(LogKeys.Username, this.tempUserName);
              this.setIsLoggedIn(true);
              this.updateUserName();
            } else {
              this.writeOutput(`Login failed! Status: ${JSON.stringify(result.status)}<br />${result.message}`);
              this.setIsLoggedIn(false);
            }
            this.prompt();
          } catch (error: any) {
            this.writeOutput(`Login failed: ${error.message}`);
          } finally {
            this.tempUserName = '';
            this.terminalReset();
            this.resetTempPassword();
          }
        })();
      }
      else {
        this.appendTempPassword(character);
        this.terminalWrite("*");
        return;
      }
    }
    if (this.isInChangePasswordMode) {
      if (character === '\r') {

        this.props.auth.changePassword(this.getTempPassword(), this.tempNewPassword, (error: any, result: any) => {
          if (error) {
            console.error(error);
          }
          else {
            this.writeOutput(`Password changed successfully! Status: ${result}`);
          }
          this.isInChangePasswordMode = false;
          this.terminalReset();
        })
        this.resetTempPassword();
      }
      else {
        this.appendTempPassword(character);
        this.terminalWrite("*");
        return;
      }
    }
    if (character.charCodeAt(0) === 3) { // Ctrl+C
      localStorage.setItem(LogKeys.CurrentCommand, '');
      this.setState({
        // isInGameMode: false,
        commandLine: ''
      });
      this.writeOutput('');
      this.adapterRef.current?.terminalReset();
      this.adapterRef.current?.prompt();
    }
    if (character === 'ArrowUp') {
      const currentCommand = this.state.commandHistoryFilter || this.adapterRef.current?.getCurrentCommand();
      this.setState({ commandHistoryFilter: currentCommand || null });
      let newCommandIndex = (this.state.commandHistoryIndex + 1) % this.state.commandHistory.length;
      let command = this.state
        .commandHistory
        .filter((ch) => ch.startsWith(currentCommand || ''))[newCommandIndex];
      const commandResponseHistory = this.getCommandResponseHistory().reverse();
      this.setState({
        commandHistoryIndex: newCommandIndex,
        commandLine: command,
        outputElements: [commandResponseHistory[newCommandIndex]],
      });

      this.terminalReset();
      this.terminalPrompt();
      this.terminalWrite(command);
      return;
    }
    if (charCodes.join(',') == '27,91,66') { // ArrowDown
      const currentCommand = this.state.commandHistoryFilter;
      let newCommandIndex = (this.state.commandHistoryIndex - 1 + this.state.commandHistory.length)
        % this.state.commandHistory.length;
      if (newCommandIndex < 0) newCommandIndex = 0;
      if (newCommandIndex >= this.state.commandHistory.length) newCommandIndex = this.state.commandHistory.length - 1;
      let command = this.state
        .commandHistory
        .filter((ch) => ch.startsWith(currentCommand || ''))[newCommandIndex];
      const commandResponseHistory = this.getCommandResponseHistory().reverse();
      this.setState({
        commandHistoryIndex: newCommandIndex,
        commandLine: command,
        outputElements: [commandResponseHistory[newCommandIndex]],
      });
      this.terminalReset();
      this.terminalPrompt();
      this.terminalWrite(command);
      return;
    }

    if (character.charCodeAt(0) === 4) { // Ctrl+D
      console.log('Ctrl+D pressed');
      this.increaseFontSize();
    }

    if (character.charCodeAt(0) === 13) { // Enter key
      // Process the command before clearing the terminal
      // TODO: cancel timer

      let command = this.adapterRef.current?.getCurrentCommand() ?? '';
      localStorage.setItem('currentCommand', '');
      this.terminalReset();
      this.handleCommand(command);
    } else if (this.activityMediator.isInGameMode) {
      // # IN PHRASE MODE
      // TODO: How is Game success handeled here?
      if (this.state.errorCharIndex) {

      }
      this.terminalWrite(character);
      let command = this.adapterRef.current?.getCurrentCommand() ?? '';
      command += character;

      this.setState({
        commandLine: command,
      });
      if ([',', '.', '!', '?'].includes(character) || /[0-9]/.test(character)) {
        this.setHeroSummersaultAction();
      }
      else {
        this.setHeroRunAction();
      }
    } else {
      // For other input, just return it to the terminal.
      this.terminalWrite(character);
      if ([',', '.', '!', '?'].includes(character) || /[0-9]/.test(character)) {
        this.setHeroSummersaultAction();
      }
      else {
        this.setHeroRunAction();
      }
    }
    return charDuration.durationMilliseconds;
  }

  getCommandResponseHistory(): string[] {
    let keys: string[] = [];
    let commandHistory: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      if (!localStorage.key(i)?.startsWith(LogKeys.Command + '_')) continue;

      const key = localStorage.key(i);
      if (!key) continue;
      keys.push(key);
    }
    keys.sort();
    for (let key of keys) {
      const historyJSON = localStorage.getItem(key);
      if (historyJSON) {
        commandHistory.push(historyJSON);
      }
    }
    return commandHistory;
  }

  averageWpmByCharacter(charWpms: CharWPM[]): CharWPM[] {
    const charGroups: Record<string, { totalWpm: number, count: number }> = {};

    // Sum WPMs for each character and count occurrences
    charWpms.forEach(({ character, wpm }) => {
      if (!charGroups[character]) {
        charGroups[character] = { totalWpm: 0, count: 0 };
      }
      charGroups[character].totalWpm += wpm;
      charGroups[character].count++;
    });

    // Calculate average WPM for each character
    return Object.entries(charGroups).map(([character, { totalWpm, count }]) => ({
      character,
      wpm: totalWpm / count,
      durationMilliseconds: 0, // You may want to handle duration aggregation differently
    }));
  }

  public saveCommandResponseHistory(command: string, response: string, status: number): string {
    const commandTime = new Date();
    const timeCode = createTimeCode(commandTime).join(':');
    let commandText = this.createCommandRecord(command, commandTime);
    // TODO: Render this with JSX instead.
    const commandElement = createHTMLElementFromHTML(commandText);
    let commandResponseElement = document.createElement('div');
    commandResponseElement.dataset.status = status.toString();
    commandResponseElement.appendChild(commandElement);
    commandResponseElement.appendChild(createHTMLElementFromHTML(`<div class="response">${response}</div>`));

    // Only keep the latest this.commandHistoryLimit number of commands
    const { wpmAverage, charWpms } = this.wpmCalculator.getWPMs();
    this.wpmCalculator.saveKeystrokes(timeCode);
    this.wpmCalculator.clearKeystrokes();
    commandResponseElement.innerHTML = commandResponseElement
      .innerHTML
      .replace(/{{wpm}}/g, wpmAverage.toFixed(0));

    commandText = commandText.replace(/\{\{wpm\}\}/g, wpmAverage.toFixed(0));

    const commandResponse = commandResponseElement.outerHTML;
    const characterAverages = this.averageWpmByCharacter(charWpms.filter(wpm => wpm.durationMilliseconds > 1));
    const slowestCharactersHTML = ReactDOMServer.renderToStaticMarkup(
      <WpmTable
        wpms={characterAverages.sort((a, b) => a.wpm - b.wpm).slice(0, 5)}
        name="slow-chars"
      />
    );

    commandResponseElement.innerHTML += slowestCharactersHTML;
    this.writeOutput(commandResponseElement.outerHTML);

    // Now you can append slowestCharactersHTML as a string to your element's innerHTML
    this._persistence.setItem(`${LogKeys.Command}_${timeCode}`, commandResponseElement.outerHTML);

    return commandResponse;
  }

  writeOutput(output: string) {
    this.commandHistoryHook.addToCommandHistory(output);
    this.setState((prevState: IHandTermState) => ({
      outputElements: [...(prevState.outputElements || []), output]
    }));
    // TO append output instead of replacing it, do this:
    // this.setState(prevState => ({
    //   outputElements: [...prevState.outputElements, output]
    // }));
  }

  createCommandRecord(command: string, commandTime: Date): string {
    const timeDisplay = ReactDOMServer.renderToString(<TimeDisplay time={commandTime} />);
    return `
      <div class="log-line">
        <span class="log-time">[${timeDisplay}]</span>
        <span class="wpm-label">WPM:</span>
        <span class="wpm">{{wpm}}</span>
        ${command}
      </div>
    `;
  }

  toggleIsDebug(setIsDebug?: boolean) {
    this.isDebug = setIsDebug ?? !this.isDebug;
    localStorage.setItem('xterm-debug', String(this.isDebug));
    console.log('Xterm debug:', this.isDebug);
  }

  loadDebugValue() {
    this.isDebug = localStorage.getItem('xterm-debug') === 'true';
  }

  private handlePhraseSuccess = (phrase: string) => {
    const wpms = this.wpmCalculator.getWPMs();
    const wpmAverage = wpms.wpmAverage;

    if (wpmAverage > this.state.targetWPM) {
      this.savePhrasesAchieved(this.state.phraseName, wpmAverage);
    }

    let wpmPhrase = wpmAverage.toString(10)
      + ':' + phrase;
    this.setState(
      (prevState: IHandTermState) => ({
        outputElements: [
          ...(prevState.outputElements || []),
          wpmPhrase
          + wpms.charWpms.join(', ')
        ]
      })
    );
    this.saveCommandResponseHistory("game", wpmPhrase, 200);
    this.activityMediator.gameHandleRef.current?.completeGame();
    this.activityMediator.gameHandleRef.current?.levelUp();
    this.handlePhraseComplete();
    this.adapterRef.current?.terminalReset();
    this.adapterRef.current?.prompt();
  }

  private handlePhraseComplete = () => {
    localStorage.setItem('currentCommand', '');
    const phrasesNotAchieved = Phrases.getPhrasesNotAchieved();
    if (phrasesNotAchieved.length === 0) {
      // Handle the case when all phrases are achieved
      this.setState({
        phraseValue: '',
        phraseName: '',
      });
    } else {
      let newPhraseIndex = (this.state.phraseIndex + 1) % phrasesNotAchieved.length;
      let newPhrase = phrasesNotAchieved[newPhraseIndex];
      this.setState({
        phraseIndex: newPhraseIndex,
        phraseValue: newPhrase.value,
        phraseName: newPhrase.key,
      });
    }
    if (this.nextCharsDisplayRef.current) this.nextCharsDisplayRef.current.cancelTimer();
    this.activityMediator.gameHandleRef.current?.completeGame();
    this.adapterRef.current?.terminalReset();
  }

  private updateUserName = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      const userName = localStorage.getItem(LogKeys.Username);
      this.setState({ userName: userName || null });
    } else {
      this.setState({ userName: null });
    }
  }

  private setNewPhrase = (phraseName: string) => {
    phraseName = phraseName.replace('phrase ', '');

    const newPhrase
      = phraseName && phraseName != "" && Phrases.getPhraseByKey(phraseName)
        ? Phrases.getPhraseByKey(phraseName)
        : Phrases.getNthPhraseNotAchieved(this.state.phraseIndex);

    this.setState((prevState: IHandTermState) => {
      return {
        ...prevState,
        isInGameMode: true,
        phraseValue: newPhrase.value,
        phraseName: newPhrase.key,
      }
    });
  }

  setHeroRunAction = () => {
    if (this.heroRunTimeoutId) {
      clearTimeout(this.heroRunTimeoutId);
      this.heroRunTimeoutId = null;
    }

    this.activityMediator.setHeroAction('Run');
    this.heroRunTimeoutId = window.setTimeout(() => {
      this.activityMediator.setHeroAction('Idle');
      this.heroRunTimeoutId = null;
    }, 800);
  }

  setHeroSummersaultAction = () => {
    if (this.heroSummersaultTimeoutId) {
      clearTimeout(this.heroSummersaultTimeoutId);
      this.heroSummersaultTimeoutId = null;
    }

    this.activityMediator.setHeroAction('Summersault');
    this.heroSummersaultTimeoutId = window.setTimeout(() => {
      this.activityMediator.setHeroAction('Idle');
      this.heroSummersaultTimeoutId = null;
    }, 800);
  }

  setHeroAction = (newAction: ActionType) => {
    if (this.heroActionTimeoutId) {
      clearTimeout(this.heroActionTimeoutId);
      this.heroActionTimeoutId = null;
    }
    this.activityMediator.setHeroAction(newAction);
    if (newAction === 'Death') return;
    this.heroActionTimeoutId = window.setTimeout(() => {
      this.activityMediator.setHeroAction('Idle');
      this.heroActionTimeoutId = null;
    }, 500);
  }

  setZombie4Action = (newAction: ActionType) => {
    this.activityMediator.setZombie4Action(newAction);
  }

  handleTimerStatusChange(isActive: boolean) {
    this.setState({ isActive });
  }

  public terminalReset(): void {
    this.adapterRef.current?.terminalReset();
  }

  private terminalPrompt(): void {
    this.adapterRef.current?.prompt();
  }

  private terminalWrite(data: string): void {
    this.adapterRef.current?.terminalWrite(data);
  }

  private appendTempPassword(password: string): void {
    this.adapterRef.current?.appendTempPassword(password);
  }
  private resetTempPassword(): void {
    this.adapterRef.current?.resetTempPassword();
  }
  private getTempPassword(): string {
    return this.adapterRef.current?.getTempPassword() || '';
  }

  private loadFontSize(): void {
    let getFontSize: string = localStorage.getItem('terminalFontSize') || this.currentFontSize.toString();
    const fontSize = (getFontSize && getFontSize == 'NaN') ? this.currentFontSize : parseInt(getFontSize);

    if (fontSize) {
      this.currentFontSize = fontSize;
      document.documentElement.style.setProperty('--terminal-font-size', `${this.currentFontSize}px`);
    }
  }

  public handleTouchStart: TouchEventHandler<HTMLElement> = (event: React.TouchEvent<HTMLElement>) => {
    setTimeout(() => {
      // this.terminalElement.focus();
    }, 500)
    if (event.touches.length === 2) {
      // event.preventDefault();
      this.lastTouchDistance = this.getDistanceBetweenTouches(event.touches as unknown as TouchList);
    }
  }

  public handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      event.preventDefault();

      const currentDistance = this.getDistanceBetweenTouches(event.touches);
      if (this.lastTouchDistance && this.lastTouchDistance > 0) {
        const eventTarget = event.target as HTMLElement;
        const scaleFactor = currentDistance / this.lastTouchDistance;
        if (eventTarget && eventTarget.nodeName === 'CANVAS') {
          this.setState((prevState: IHandTermState) => {
            return {
              canvasHeight: (prevState.canvasHeight || 0) * scaleFactor
            }
          })
          return;
        }
        this.currentFontSize *= scaleFactor;
        document.documentElement.style.setProperty('--terminal-font-size', `${this.currentFontSize}px`);
        this.lastTouchDistance = currentDistance;
        // this.terminal.options.fontSize = this.currentFontSize;
        // this.terminal.refresh(0, this.terminal.rows - 1); // Refresh the terminal display
      }
    }
  }

  public increaseFontSize() {
    this.currentFontSize += 1;
    // this.terminal.options.fontSize = this.currentFontSize;
    // this.terminal.refresh(0, this.terminal.rows - 1);
    localStorage.setItem('terminalFontSize', `${this.currentFontSize}`);
    console.log('INCREASE terminalFontSize', this.currentFontSize);
  }

  public handleTouchEnd: TouchEventHandler<HTMLDivElement> = () => {
    localStorage.setItem('terminalFontSize', `${this.currentFontSize}`);
    console.log('SET terminalFontSize', this.currentFontSize);
    this.lastTouchDistance = null;
  }

  addTouchListeners() {
    // Assuming 'terminalElementRef' points to the div you want to attach the event
    const output = window.document.getElementById(TerminalCssClasses.Output);
    if (output) {
      output.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    }
    const terminal = document.getElementById(TerminalCssClasses.Terminal);
    if (terminal) {
      terminal.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    }
    const game = window.document.getElementById(TerminalCssClasses.TerminalGame);
    if (game) {
      // game.addEventListener('touchstart', this.handleTouchStart );
      game.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    }
  }

  removeTouchListeners() {
    const div = this.terminalElementRef.current;
    if (div) {
      div.removeEventListener('touchmove', this.handleTouchMove);
    }
    const output = window.document.getElementById(TerminalCssClasses.Output);
    if (output) {
      output.removeEventListener('touchmove', this.handleTouchMove);
    }
    const terminal = document.getElementById(TerminalCssClasses.Terminal);
    if (terminal) {
      terminal.removeEventListener('touchmove', this.handleTouchMove);
    }
    const game = window.document.getElementById(TerminalCssClasses.TerminalGame);
    if (game) {
      game.removeEventListener('touchmove', this.handleTouchMove);
    }
  }

  private getDistanceBetweenTouches(touches: TouchList): number {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.pageX - touch1.pageX, 2) +
      Math.pow(touch2.pageY - touch1.pageY, 2),
    );
  }

  public toggleVideo = (): boolean => {
    this.setState((prevState: IHandTermState) => ({
      isShowVideo: !(prevState.isShowVideo || false)
    }))
    return !this.state.isShowVideo;
  }

  public render() {
    const { terminalSize, outputElements, canvasHeight, phrasesAchieved, phraseValue, commandLine, lastTypedCharacter, userName, domain, githubUsername, timestamp, editMode, editContent, editLanguage, isShowVideo } = this.state;
    const canvasWidth = terminalSize ? terminalSize.width : 800;
    // canvas height does not need to match terminal height

    return (
      <CommandContext.Consumer>
        {(context) => {
          if (context !== this.context) {
            // Update context in a safe way
            setTimeout(() => {
              this.context = context;
              this.forceUpdate();
            }, 0);
          }
          return (
            <div className="terminal-container">
              <Output
                ref={this.outputRef}
                elements={outputElements}
                onTouchStart={this.handleTouchStart}
                onTouchEnd={this.handleTouchEnd}
              />
              <Game
                ref={this.activityMediator.gameHandleRef}
                canvasHeight={canvasHeight}
                canvasWidth={canvasWidth}
                isInGameMode={this.activityMediator.isInGameMode}
                heroActionType={this.activityMediator.heroAction}
                zombie4ActionType={this.activityMediator.zombie4Action}
                onSetHeroAction={this.setHeroAction}
                onSetZombie4Action={this.activityMediator.setZombie4Action}
                onTouchStart={this.handleTouchStart}
                onTouchEnd={this.handleTouchEnd}
                phrasesAchieved={phrasesAchieved}
                zombie4StartPosition={this.zombie4StartPostion}
              />
              {this.activityMediator.isInGameMode && phraseValue && (
                <NextCharsDisplay
                  ref={this.nextCharsDisplayRef}
                  commandLine={commandLine}
                  isInPhraseMode={this.activityMediator.isInGameMode}
                  newPhrase={phraseValue}
                  onPhraseSuccess={this.handlePhraseSuccess}
                  onError={this.handlePhraseErrorState}
                />
              )}
              {lastTypedCharacter && (
                <Chord displayChar={lastTypedCharacter} />
              )}
              {this.activityMediator.isInTutorial &&
                TutorialComponent && (
                  <TutorialComponent
                    achievement={this.activityMediator.achievement}
                    isInTutorial={this.activityMediator.isInTutorial}
                    includeReturn={true}
                  />
                )
              }
              <Prompt
                username={userName || 'guest'}
                domain={domain || 'handterm'}
                githubUsername={githubUsername}
                timestamp={timestamp}
              />
              {!editMode && (
                <XtermAdapter
                  ref={this.adapterRef}
                  terminalElementRef={this.terminalElementRef}
                  terminalFontSize={this.currentFontSize}
                  onAddCharacter={this.handleCharacter}
                  onRemoveCharacter={this.handleRemoveCharacter}
                  onTouchStart={this.handleTouchStart}
                  onTouchEnd={this.handleTouchEnd}
                />
              )}
              {editMode && (
                <MonacoEditor
                  initialValue={editContent}
                  language={editLanguage}
                  onChange={(value) => this.handleEditChange(value || '')}
                  onSave={this.handleEditSave}
                  onClose={this.handleEditorClose}
                  toggleVideo={this.toggleVideo}
                />
              )}
              {isShowVideo && (
                <WebCam
                  setOn={isShowVideo}
                />
              )}
            </div>
          );
        }}
      </CommandContext.Consumer>
    );
  }

  forceUpdate(callback?: () => void): void {
    super.forceUpdate(callback);
  }
}

HandTerm.contextType = CommandContext;
const HandTermWrapper = React.forwardRef<IHandTermMethods, IHandTermProps>((props, ref) => {
  const commandHistoryHook = useCommandHistory(loadCommandHistory());
  const activityMediator = useActivityMediator(getNextTutorialAchievement() || { phrase: [], prompt: '', unlocked: false });

  return (
    <HandTerm
      ref={ref as React.Ref<HandTerm>}
      {...props}
      commandHistoryHook={commandHistoryHook}
      activityMediator={activityMediator}
    />
  );
});

export default HandTermWrapper;
