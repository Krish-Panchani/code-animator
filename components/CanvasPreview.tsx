"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CanvasPreviewProps {
  code: string;
  /** Increment to trigger a run (e.g. when user clicks Play). */
  runTrigger?: number;
  className?: string;
}

/**
 * Runs user code in a sandboxed iframe with a canvas and 2D context.
 * Exposes: ctx, canvas, width, height, requestAnimationFrame, cancelAnimationFrame.
 */
export function CanvasPreview({ code, runTrigger = 0, className = "" }: CanvasPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = useCallback(() => {
    setError(null);
    setIsRunning(true);

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const canvas = doc.getElementById("preview-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Could not get 2D context");
      setIsRunning(false);
      return;
    }

    const script = doc.createElement("script");
    script.textContent = `
      (function() {
        var canvas = document.getElementById("preview-canvas");
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        try {
          with ({ ctx, canvas, width, height, requestAnimationFrame, cancelAnimationFrame }) {
            ${code}
          }
        } catch (e) {
          window.__previewError = e.message;
        }
      })();
    `;

    try {
      doc.body.appendChild(script);
      doc.body.removeChild(script);

      const err = (iframe.contentWindow as Window & { __previewError?: string }).__previewError;
      if (err) {
        setError(err);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execution failed");
    }

    setIsRunning(false);
  }, [code]);

  useEffect(() => {
    if (runTrigger > 0) runCode();
  }, [runTrigger, runCode]);

  const srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f0f; display: flex; align-items: center; justify-content: center; min-height: 100%; }
    canvas { display: block; max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  <canvas id="preview-canvas" width="640" height="360"></canvas>
</body>
</html>`;

  return (
    <div className={`canvas-preview flex flex-col ${className}`}>
      <div className="flex items-center border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Preview
        </span>
        {isRunning && (
          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Running…</span>
        )}
      </div>
      <div className="relative flex-1 min-h-0 bg-zinc-900 flex items-center justify-center overflow-hidden">
        {error && (
          <div className="absolute inset-x-0 top-0 z-10 bg-red-500/90 text-white px-4 py-2 text-sm font-mono">
            {error}
          </div>
        )}
        <iframe
          ref={iframeRef}
          title="Canvas preview"
          srcDoc={srcdoc}
          sandbox="allow-scripts"
          className="w-full h-full min-h-[200px] border-0"
        />
      </div>
    </div>
  );
}
