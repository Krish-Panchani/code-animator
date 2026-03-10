"use client";

import { useState, useCallback } from "react";
import { CodeEditor, getDefaultCode } from "@/components/CodeEditor";
import { CodePreview, type CodePreviewOptions } from "@/components/CodePreview";

const defaultPreviewOptions: CodePreviewOptions = {
  theme: "dark",
  animationType: "typing",
  speed: 1,
  showLineNumbers: true,
  fontSize: "large",
  wordWrap: true,
  backgroundColor: "black",
  highlightLineStart: 1,
  highlightLineEnd: 1,
  iosCardMode: false,
  iosCardFilename: "index.ts",
  iosCardAccount: "Code Animator",
};

export default function Home() {
  const [code, setCode] = useState(getDefaultCode);
  const [runTrigger, setRunTrigger] = useState(0);
  const [previewOptions, setPreviewOptions] = useState<CodePreviewOptions>(defaultPreviewOptions);

  const handleRun = useCallback(() => {
    setRunTrigger((t) => t + 1);
  }, []);

  const handlePreviewOptionsChange = useCallback((next: Partial<CodePreviewOptions>) => {
    setPreviewOptions((prev) => ({ ...prev, ...next }));
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-100 dark:bg-zinc-950">
      {/* <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Code Animator
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Write code → Play → Record the animated preview for reels
        </p>
      </header> */}

      <div className="flex flex-1 min-h-0 gap-px bg-zinc-200 dark:bg-zinc-800">
        <section className="flex w-1/2 flex-col min-w-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CodeEditor
            value={code}
            onChange={setCode}
            onRun={handleRun}
            theme={previewOptions.theme}
            previewOptions={previewOptions}
            onPreviewOptionsChange={handlePreviewOptionsChange}
            className="h-full"
          />
        </section>
        <section className="flex w-1/2 flex-col min-w-0 bg-white dark:bg-zinc-900">
          <CodePreview
            code={code}
            runTrigger={runTrigger}
            options={previewOptions}
            onOptionsChange={setPreviewOptions}
            className="h-full"
          />
        </section>
      </div>
    </div>
  );
}
