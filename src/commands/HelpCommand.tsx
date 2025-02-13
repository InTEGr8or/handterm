import ReactDOMServer from 'react-dom/server';

import { Chord } from '../components/Chord';
import { commandRegistry } from './commandRegistry';
import { type ICommand, type ICommandResponse, type ICommandContext } from '../contexts/CommandContext';
import { type ParsedCommand } from '../types/Types';

export const HelpCommand: ICommand = {
  name: 'help',
  description: 'Display help information',
  execute: (
    _context: ICommandContext,
    parsedCommand: ParsedCommand,
  ): Promise<ICommandResponse> => {
    if (
      parsedCommand.command === 'help'
      || parsedCommand.command === '411'
    ) {
      const commandChords = [
        'DELETE (Backspace)',
        '\r',
        'UpArrow',
        'LeftArrow',
        'DownArrow',
        'RightArrow',
        'ESCAPE',
      ].map(c => (
        <Chord key={c} displayChar={c} />
      ));
      const commandChordsHtml = commandChords.map(element => (
        // eslint-disable-next-line import/no-named-as-default-member
        ReactDOMServer.renderToStaticMarkup(element)
      )).join('');
      const commandList = commandRegistry.getHelp();
      const response = `
        <div class='chord-display-container'>${commandChordsHtml}</div>
        <div class='command-list-container'>
          <h3>Available Commands:</h3>
          <pre>${commandList}</pre>
        </div>
      `;
      return Promise.resolve<ICommandResponse>({ status: 200, message: response });
    }
    return Promise.resolve<ICommandResponse>({ status: 404, message: "Help command not recognized" });
  }
};