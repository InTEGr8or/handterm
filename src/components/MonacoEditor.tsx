import React, { useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useAuth } from '../hooks/useAuth';
import { createLogger, LogLevel } from 'src/utils/Logger';

const logger = createLogger({
  prefix: 'MonacoEditor',
  level: LogLevel.DEBUG
});

interface TreeItem {
  path: string;
  type: 'file' | 'directory';
}

interface MonacoEditorProps {
  initialValue?: string;
  language?: string;
  onClose: () => void;
  height?: string;
  isTreeView?: boolean;
  treeItems?: TreeItem[];
  onFileSelect?: (file: string) => void;
}

const MonacoEditor = forwardRef<editor.IStandaloneCodeEditor, MonacoEditorProps>(
  ({
    initialValue: _initialValue,
    language: _language,
    onClose,
    height = '80vh',
    isTreeView,
    treeItems = [],
    onFileSelect
  }, ref) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const _monacoRef = useRef<Monaco | null>(null);
    const [_isEditorReady, setIsEditorReady] = useState(false);
    const [_expandedFolders] = useState<Set<string>>(new Set());
    const auth = useAuth();

    const _handleGitHubSave = useCallback(async (_value?: string): Promise<void> => {
      try {
        const currentRepo = localStorage.getItem('current_github_repo');
        const currentFile = localStorage.getItem('current_github_file');

        if (!currentRepo || !currentFile) {
          logger.error('No repository or file selected for saving');
          return;
        }

        // Use a generic file save method from auth
        const response = await auth.login(currentRepo, currentFile);

        if (response.status === 200) {
          logger.info('File saved to GitHub successfully');
        } else {
          logger.error('Failed to save file to GitHub:', response.message);
          throw new Error(response.message);
        }
      } catch (error) {
        logger.error('Error saving to GitHub:', error);
      }
    }, [auth]);

    const _handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, _monaco: Monaco) => {
      logger.info('Editor mounted, setting up...');
      editorRef.current = editor;

      if (isTreeView) {
        logger.info('Setting up tree view mode');
        editor.updateOptions({ readOnly: true });
      } else {
        setIsEditorReady(true);
        logger.info('Editor ready');
      }
    }, [isTreeView]);

    useImperativeHandle(ref, () => {
      if (!editorRef.current) {
        throw new Error('Editor ref is not available');
      }
      return editorRef.current;
    }, [editorRef]);

    const handleFileSelection = useCallback((item: TreeItem) => {
      if (item.type === 'directory') {
        logger.debug('Toggling directory:', item.path);
        // Toggle directory expansion logic
      } else if (onFileSelect) {
        logger.info('Opening file:', item.path);
        onFileSelect(item.path);
      }
    }, [onFileSelect]);

    return (
      <div style={{ height, width: '100%' }}>
        {isTreeView && treeItems.length > 0 && (
          <div>
            {treeItems.map((item, index) => (
              <div key={index} onClick={() => handleFileSelection(item)}>
                {item.path}
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
);

export default MonacoEditor;
