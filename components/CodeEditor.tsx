"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tokenize, tokenToClassName } from "@/lib/syntax-highlighter";
import { PreviewSettingsPanel } from "@/components/PreviewSettingsPanel";
import type { CodePreviewOptions } from "@/components/CodePreview";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DEFAULT_CODE = `// Code Animator — perfect for reels
// Write your snippet, pick theme & animation, hit Play

function greet(name) {
  return "Hello, " + name + "!";
}

const message = greet("World");
console.log(message);
`;

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  theme?: "light" | "dark";
  previewOptions?: CodePreviewOptions;
  onPreviewOptionsChange?: (next: Partial<CodePreviewOptions>) => void;
  placeholder?: string;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  onRun,
  theme = "dark",
  previewOptions,
  onPreviewOptionsChange,
  placeholder = "// Write JavaScript or TypeScript...",
  className = "",
}: CodeEditorProps) {
  const isDark = theme === "dark";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [tokens, setTokens] = useState<ReturnType<typeof tokenize>>([]);
  const [highlightClickPhase, setHighlightClickPhase] = useState<"start" | "end">("start");

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (ta && ov) {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    }
  }, []);

  useEffect(() => {
    setTokens(tokenize(value || ""));
  }, [value]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onScroll = () => syncScroll();
    ta.addEventListener("scroll", onScroll);
    return () => ta.removeEventListener("scroll", onScroll);
  }, [syncScroll]);

  const highlighted = tokens.length
    ? tokens
        .map(
          (t) =>
            `<span class="${tokenToClassName(t.type)}">${escapeHtml(t.value)}</span>`
        )
        .join("")
    : escapeHtml(value || "");

  const displayValue = value || "";
  const lines = displayValue.split("\n");
  const lineCount = Math.max(1, lines.length);
  const isHighlightMode =
    previewOptions?.animationType === "highlight" && onPreviewOptionsChange;

  const handleLineNumberClick = useCallback(
    (lineNum: number) => {
      if (!isHighlightMode || !onPreviewOptionsChange || !previewOptions) return;
      if (highlightClickPhase === "start") {
        onPreviewOptionsChange({
          highlightLineStart: lineNum,
          highlightLineEnd: lineNum,
        });
        setHighlightClickPhase("end");
      } else {
        onPreviewOptionsChange({
          highlightLineStart: previewOptions.highlightLineStart,
          highlightLineEnd: lineNum,
        });
        setHighlightClickPhase("start");
      }
    },
    [isHighlightMode, onPreviewOptionsChange, previewOptions, highlightClickPhase]
  );

  return (
    <div
      className={`code-editor-wrapper flex flex-col ${className}`}
      data-theme={theme}
    >
      <div
        className={
          isDark
            ? "flex items-center justify-between border-b border-[#44475a] bg-[#282a36] px-3 py-2"
            : "flex items-center justify-between border-b border-zinc-300 bg-zinc-100 px-3 py-2"
        }
      >
        <span
          className={
            isDark ? "text-xs font-medium text-[#6272a4] uppercase tracking-wider" : "text-xs font-medium text-zinc-500 uppercase tracking-wider"
          }
        >
          Editor
        </span>
        {onRun && (
          <button
            type="button"
            onClick={onRun}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            <PlayIcon className="h-4 w-4" />
            Play
          </button>
        )}
      </div>
      {previewOptions && onPreviewOptionsChange && (
        <div className="shrink-0 border-b border-zinc-700 bg-zinc-800/60 px-3 py-1.5">
          <PreviewSettingsPanel
            options={previewOptions}
            lineCount={lineCount}
            onOptionsChange={onPreviewOptionsChange}
            variant="editor"
          />
        </div>
      )}
      <div className={`relative flex flex-1 min-h-0 font-mono text-sm ${isDark ? "bg-[#282a36]" : "bg-zinc-50"}`}>
        <div
          className={`absolute left-0 top-0 z-10 flex flex-col py-3 pl-3 pr-2 select-none border-r min-w-[2.5rem] items-end ${
            isDark ? "text-[#6272a4] border-[#44475a]" : "text-zinc-500 border-zinc-300"
          } ${isHighlightMode ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!isHighlightMode}
        >
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = i + 1;
            const isInRange =
              previewOptions &&
              lineNum >= previewOptions.highlightLineStart &&
              lineNum <= previewOptions.highlightLineEnd;
            return isHighlightMode ? (
              <button
                key={i}
                type="button"
                onClick={() => handleLineNumberClick(lineNum)}
                className={`leading-[1.6] w-full text-right pr-1 rounded hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isInRange ? "bg-emerald-500/20 text-emerald-400" : ""
                }`}
                title={
                  highlightClickPhase === "start"
                    ? "Click to set highlight start line"
                    : "Click to set highlight end line"
                }
              >
                {lineNum}
              </button>
            ) : (
              <div key={i} className="leading-[1.6]">
                {lineNum}
              </div>
            );
          })}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          placeholder={placeholder}
          spellCheck={false}
          className="code-editor-input absolute inset-0 w-full resize-none bg-transparent py-3 pl-12 pr-3 font-mono text-sm leading-[1.6] text-transparent focus:outline-none selection:bg-blue-500/30"
          style={{ caretColor: isDark ? "#f8f8f2" : "#24292f" }}
        />
        <div
          ref={overlayRef}
          className="code-editor-overlay absolute inset-0 w-full overflow-auto py-3 pl-12 pr-3 pointer-events-none"
          aria-hidden
        >
          <pre
            className="m-0 font-mono text-sm leading-[1.6] whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{
              __html: highlighted || escapeHtml(placeholder),
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function getDefaultCode(): string {
  return DEFAULT_CODE;
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
