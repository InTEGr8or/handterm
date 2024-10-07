// src/contexts/CommandContext.tsx
import React, { createContext, useContext } from 'react';
import { IAuthProps } from '../lib/useAuth';
import { IHandTermWrapperMethods } from '../components/HandTermWrapper';

export interface ICommandResponse {
  status: number;
  message: string;
}

export interface ICommand {
  name: string;
  description: string;
  switches?: Record<string, string>;
  execute: (
    commandName: string,
    context: ICommandContext,
    args?: string[],
    switches?: Record<string, boolean | string>,
  ) => ICommandResponse;
}
export interface ICommandContext {
  executeCommand: (command: string) => Promise<void>;
  commandHistory: string[];
  addToCommandHistory: (command: string) => void;
  output: React.ReactNode[];
  appendToOutput: (output: React.ReactNode) => void;
  handTermRef: React.RefObject<IHandTermWrapperMethods>;
  auth: IAuthProps;
}

export const CommandContext = createContext<ICommandContext | null>(null);

export const useCommandContext = () => {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error('useCommandContext must be used within a CommandProvider');
  }
  return context;
};