// src/components/MonacoEditor.tsx
import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Editor from "@monaco-editor/react";

interface MonacoEditorProps {
  initialValue: string;
  language: 'javascript' | 'typescript' | 'markdown';
  onChange?: (value: string | undefined) => void;
  onSave?: (value: string) => void;
  onClose?: () => void;
  height?: string;
  toggleVideo?: () => boolean;
}

declare global {
  interface Window {
    MonacoVim?: any;
    require: {
      config: (params: any) => void;
    };
  }
}

export interface MonacoEditorHandle {
  focus: () => void;
}

const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(({ initialValue, language, onChange, onSave, onClose, height = '80vh', toggleVideo }, ref) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const statusNodeRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }
  }));

  useEffect(() => { 
    return () => {
      if (window.MonacoVim) {
        window.MonacoVim.VimMode.Vim.dispose();
      }
    };
  }, []);

  function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) {
    editorRef.current = editor;
    setTimeout(() => editor.focus(), 100);

    editor.addAction({
      id: "save-content",
      label: "Save Content",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
      run: function (editor: monaco.editor.IStandaloneCodeEditor) {
        if (onSave) {
          onSave(editor.getValue());
        }
        return null;
      }
    });

    window.require.config({
      paths: {
        "monaco-vim": "https://unpkg.com/monaco-vim/dist/monaco-vim"
      }
    });

    // @ts-ignore
    window.require(["monaco-vim"], (MonacoVim: any) => {
      if (statusNodeRef.current) {
        MonacoVim.initVimMode(editor, statusNodeRef.current);
      }

      // Define Vim commands
      const Vim = MonacoVim.VimMode.Vim;
      Vim.defineEx('w', '', () => {
        if (onSave) {
          onSave(editor.getValue());
        }
      });

      Vim.defineEx('q', '', () => {
        if (onClose) {
          onClose();
        }
      });
      Vim.defineEx('wq', '', () => {
        if (onSave) {
          onSave(editor.getValue());
        }
        if (onClose) {
          onClose();
        }
      })

      Vim.defineEx('vid', '', () => {
        if (toggleVideo) {
          toggleVideo();
        }
      });
    });
  }

  return (
    <div className="monaco-editor-container">
      <Editor
        key={language}
        height={height}
        defaultLanguage={language}
        defaultValue={initialValue}
        onMount={handleEditorDidMount}
        onChange={onChange}
        theme="vs-dark"
      />
      <div ref={statusNodeRef} className="status-node"></div>
    </div>
  );
});

export default MonacoEditor;
