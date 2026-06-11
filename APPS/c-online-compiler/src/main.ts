import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { init, Wasmer, Directory } from "@wasmer/sdk";

// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  }
};

const initialCode = `#include <stdio.h>

int main() {
    printf("Hello from C in the browser!\\n");
    for (int i = 0; i < 5; i++) {
        printf("Iteration %d\\n", i);
    }
    return 0;
}
`;

let editor: monaco.editor.IStandaloneCodeEditor;
let wasmerInitialized = false;

async function initApp() {
  // Initialize Monaco
  editor = monaco.editor.create(document.getElementById('editor')!, {
    value: initialCode,
    language: 'c',
    theme: 'vs-dark',
    automaticLayout: true,
  });

  const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
  const outputDiv = document.getElementById('output') as HTMLDivElement;
  const compilerSelect = document.getElementById('compiler-select') as HTMLSelectElement;

  function log(msg: string, type: 'info' | 'error' | 'system' = 'info') {
    const span = document.createElement('span');
    span.className = type;
    span.textContent = msg;
    outputDiv.appendChild(span);
    outputDiv.scrollTop = outputDiv.scrollHeight;
  }

  runBtn.onclick = async () => {
    if (!wasmerInitialized) {
      log("Initializing Wasmer SDK...", "system");
      try {
        await init();
        wasmerInitialized = true;
        log("Wasmer SDK initialized.\n", "system");
      } catch (e) {
        log(`Failed to initialize Wasmer: ${e}\n`, "error");
        return;
      }
    }

    const code = editor.getValue();
    const packageName = compilerSelect.value;
    
    runBtn.disabled = true;
    outputDiv.textContent = "";
    log(`Compiling and running with ${packageName}...\n`, "system");

    try {
      const fs = new Directory();
      await fs.writeFile("main.c", new TextEncoder().encode(code));

      if (packageName.includes("tcc")) {
        // TCC: Compile and run in one step
        log("Loading TCC...\n", "system");
        const pkg = await Wasmer.fromRegistry("syrusakbary/tcc");
        
        if (!pkg.entrypoint) throw new Error("Package has no entrypoint");

        const instance = await pkg.entrypoint.run({
          args: ["-run", "main.c"],
          mount: {
            "/src": fs
          },
          cwd: "/src"
        });

        const { stdout, stderr } = await instance.wait();
        if (stdout) log(stdout);
        if (stderr) log(stderr, "error");
      } else {
        // Clang: Compile to wasm first
        log("Loading Clang and compiling to WebAssembly (this may take a while)...\n", "system");
        const pkg = await Wasmer.fromRegistry("clang/clang");
        
        if (!pkg.entrypoint) throw new Error("Package has no entrypoint");

        const instance = await pkg.entrypoint.run({
          args: ["main.c", "-o", "main.wasm"],
          mount: {
            "/src": fs
          },
          cwd: "/src"
        });

        const compileResult = await instance.wait();
        if (compileResult.stderr) log(compileResult.stderr, "error");

        if (compileResult.ok) {
          log("Compilation successful. Executing...\n", "system");
          const wasmBytes = await fs.readFile("main.wasm");
          
          const runner = await Wasmer.fromFile(wasmBytes);
          if (!runner.entrypoint) {
            throw new Error("Compiled Wasm has no entrypoint");
          }
          const runInstance = await runner.entrypoint.run();
          const { stdout, stderr } = await runInstance.wait();
          
          if (stdout) log(stdout);
          if (stderr) log(stderr, "error");
        } else {
          log("Compilation failed.\n", "error");
        }
      }

      log("\nProgram finished.\n", "system");
    } catch (e) {
      log(`Execution error: ${e}\n`, "error");
    } finally {
      runBtn.disabled = false;
    }
  };
}

initApp();
