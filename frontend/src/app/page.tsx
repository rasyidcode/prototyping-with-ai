'use client';

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

export default function Home() {
  const [code, setCode] = useState<string | undefined>(
    '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n'
  );
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({
    type: 'idle',
    message: ''
  });

  const handleRun = async () => {
    if (!code) return;

    setIsLoading(true);
    setOutput('');
    setStatus({ type: 'idle', message: 'Compiling and running...' });

    try {
      const response = await fetch('http://localhost:5000/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        setOutput(data.output || 'Program executed successfully (no output).');
        if (data.stderr) {
          setOutput(prev => prev + '\n--- Standard Error ---\n' + data.stderr);
        }
        setStatus({ type: 'success', message: `Executed in ${data.duration}ms` });
      } else {
        setOutput(data.details || data.error || 'An unknown error occurred.');
        setStatus({ type: 'error', message: data.error });
      }
    } catch (error) {
      setOutput('Failed to connect to the backend server.');
      setStatus({ type: 'error', message: 'Connection Error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg">C</div>
          <h1 className="text-xl font-bold tracking-tight">Secure Online C Compiler</h1>
        </div>
        <button
          onClick={handleRun}
          disabled={isLoading}
          className={`px-6 py-2 rounded-md font-semibold transition-all shadow-lg flex items-center gap-2 ${
            isLoading 
              ? 'bg-slate-700 cursor-not-allowed opacity-70' 
              : 'bg-green-600 hover:bg-green-500 active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Run Code
            </>
          )}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Pane */}
        <div className="flex-1 border-r border-slate-700">
          <Editor
            height="100%"
            defaultLanguage="c"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value)}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 16 },
            }}
          />
        </div>

        {/* Output Pane */}
        <div className="w-1/3 flex flex-col bg-slate-900 overflow-hidden">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-sm font-medium text-slate-400">
            <span>Output Console</span>
            {status.message && (
              <span className={`flex items-center gap-1 ${
                status.type === 'success' ? 'text-green-400' : status.type === 'error' ? 'text-red-400' : 'text-blue-400'
              }`}>
                {status.message}
              </span>
            )}
          </div>
          <pre className="flex-1 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap selection:bg-blue-500/30">
            {output || <span className="text-slate-600 italic">Click "Run Code" to see the output here...</span>}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
        <p>Isolated Environment: GCC on Alpine Linux</p>
        <p>Limits: 5s, 50MB, 0.5 CPU, No Network</p>
      </footer>
    </main>
  );
}
