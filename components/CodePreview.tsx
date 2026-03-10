"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { tokenize, tokenToClassName, type Token } from "@/lib/syntax-highlighter";
import { IOSCard } from "@/components/IOSCard";
import { PreviewSettingsPanel } from "@/components/PreviewSettingsPanel";

export type PreviewTheme = "dark" | "light";
export type PreviewAnimationType = "typing" | "fade" | "highlight";

export type PreviewBackgroundColor =
  | "dracula"
  | "draculaBlue"
  | "black"
  | "white"
  | "gray"
  | "grayLight";

export interface CodePreviewOptions {
  theme: PreviewTheme;
  animationType: PreviewAnimationType;
  /** 0.5 = slow, 1 = normal, 2 = fast */
  speed: number;
  showLineNumbers: boolean;
  fontSize: "small" | "medium" | "large" | "xlarge";
  wordWrap: boolean;
  backgroundColor: PreviewBackgroundColor;
  highlightLineStart: number;
  highlightLineEnd: number;
  /** Show preview inside an iOS/Mac-style window card */
  iosCardMode: boolean;
  iosCardFilename?: string;
  iosCardAccount?: string;
}

const BACKGROUND_COLORS: Record<PreviewBackgroundColor, string> = {
  dracula: "#282a36",
  draculaBlue: "#1e1b4b",
  black: "#000000",
  white: "#ffffff",
  gray: "#374151",
  grayLight: "#f3f4f6",
};

const DEFAULT_OPTIONS: CodePreviewOptions = {
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

interface CodePreviewProps {
  code: string;
  /** Increment to start/replay animation (e.g. when user clicks Play). */
  runTrigger?: number;
  options?: Partial<CodePreviewOptions>;
  onOptionsChange?: (options: CodePreviewOptions) => void;
  className?: string;
}

/** Group tokens by line (by start offset). */
function groupTokensByLine(code: string, tokens: Token[]): Token[][] {
  const lines = code.split("\n");
  const lineStarts: number[] = [];
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    lineStarts.push(pos);
    pos += lines[i].length + 1;
  }
  const byLine: Token[][] = lines.map(() => []);
  for (const t of tokens) {
    let lineIndex = 0;
    for (let i = 0; i < lineStarts.length; i++) {
      if (t.start >= lineStarts[i]) lineIndex = i;
    }
    byLine[lineIndex].push(t);
  }
  return byLine;
}

export function CodePreview({
  code,
  runTrigger = 0,
  options: controlledOptions,
  onOptionsChange,
  className = "",
}: CodePreviewProps) {
  const [localOptions, setLocalOptions] = useState<CodePreviewOptions>(DEFAULT_OPTIONS);
  const options: CodePreviewOptions = {
    ...DEFAULT_OPTIONS,
    ...(controlledOptions ?? localOptions),
  };
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const setOptions = useCallback(
    (next: Partial<CodePreviewOptions>) => {
      const merged: CodePreviewOptions = { ...DEFAULT_OPTIONS, ...optionsRef.current, ...next };
      if (onOptionsChange) onOptionsChange(merged);
      else setLocalOptions(merged);
    },
    [onOptionsChange]
  );

  const [animationKey, setAnimationKey] = useState(0);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const tokens = tokenize(code || "");
  const linesWithTokens = groupTokensByLine(code || "", tokens);

  const isDark = options.theme === "dark";
  const lineCount = Math.max(1, (code || "").split("\n").length);
  const fontSizeClass =
    options.fontSize === "small"
      ? "text-xs"
      : options.fontSize === "large"
        ? "text-base"
        : options.fontSize === "xlarge"
          ? "text-lg"
          : "text-sm";

  const previewBg = BACKGROUND_COLORS[options.backgroundColor];
  const isDarkBg =
    options.backgroundColor === "dracula" ||
    options.backgroundColor === "draculaBlue" ||
    options.backgroundColor === "black" ||
    options.backgroundColor === "gray";

  // When Play is clicked, bump key to remount content for GSAP
  useEffect(() => {
    if (runTrigger === 0) return;
    setAnimationKey((k) => k + 1);
  }, [runTrigger]);

  // After remount, run GSAP typing, fade, or highlight animation
  useEffect(() => {
    if (runTrigger === 0 || animationKey === 0) return;
    const container = contentContainerRef.current;
    if (!container) return;

    let delayTween: gsap.core.Tween | null = null;
    const ctx = gsap.context(() => {
      if (options.animationType === "typing") {
        const els = container.querySelectorAll<HTMLElement>(".code-preview-token");
        if (els.length === 0) return;
        gsap.set(els, { opacity: 0 });
        gsap.to(els, {
          opacity: 1,
          duration: 0.28,
          stagger: Math.max(0.012, 0.05 / options.speed),
          ease: "power2.out",
          overwrite: true,
        });
      } else if (options.animationType === "fade") {
        const els = container.querySelectorAll<HTMLElement>(".code-preview-line");
        if (els.length === 0) return;
        gsap.set(els, { opacity: 0, y: 8 });
        gsap.to(els, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: Math.max(0.035, 0.085 / options.speed),
          ease: "power2.out",
          overwrite: true,
        });
      } else if (options.animationType === "highlight") {
        const els = container.querySelectorAll<HTMLElement>(".code-preview-line");
        if (els.length === 0) return;
        const start = Math.max(1, Math.min(options.highlightLineStart, options.highlightLineEnd));
        const end = Math.min(lineCount, Math.max(options.highlightLineStart, options.highlightLineEnd));
        const isDarkBgLocal =
          options.backgroundColor === "dracula" ||
          options.backgroundColor === "draculaBlue" ||
          options.backgroundColor === "black" ||
          options.backgroundColor === "gray";
        const highlightBg = isDarkBgLocal ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
        gsap.set(els, { opacity: 1, backgroundColor: "transparent" });
        delayTween = gsap.delayedCall(2, () => {
          els.forEach((el, i) => {
            const lineNum = i + 1;
            const isHighlighted = lineNum >= start && lineNum <= end;
            if (!isHighlighted) {
              gsap.to(el, {
                opacity: 0.35,
                duration: 0.35,
                ease: "power2.out",
                overwrite: true,
              });
            } else {
              gsap.set(el, { backgroundColor: highlightBg });
            }
          });
        });
      }
    }, container);

    return () => {
      if (delayTween) delayTween.kill();
      ctx.revert();
    };
  }, [runTrigger, animationKey, options.animationType, options.speed, options.highlightLineStart, options.highlightLineEnd, lineCount]);

  return (
    <div
      className={`code-preview flex flex-col ${className}`}
      data-theme={isDarkBg ? "dark" : "light"}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-700 bg-zinc-800/80 px-3 py-1.5">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Preview
        </span>
        {onOptionsChange && (
          <PreviewSettingsPanel
            options={options}
            lineCount={lineCount}
            onOptionsChange={(next) => setOptions(next)}
            variant="preview"
          />
        )}
      </div>

      {/* Preview area: centered; optional iOS card wrapper */}
      <div
        className="relative flex-1 min-h-0 overflow-auto flex items-center justify-center p-6"
        style={{ backgroundColor: previewBg }}
      >
        <div className="w-full max-w-4xl mx-auto" ref={contentContainerRef}>
          {options.iosCardMode ? (
            <IOSCard
              filename={options.iosCardFilename}
              account={options.iosCardAccount}
              backgroundColor={previewBg}
              dark={isDarkBg}
              className="w-full"
            >
              <div
                className="p-4 overflow-auto max-h-[70vh]"
                style={{ backgroundColor: previewBg }}
              >
                <div className="flex gap-4 items-start">
                  {options.showLineNumbers && (
                    <div
                      className={`shrink-0 select-none font-mono ${fontSizeClass} text-right ${
                        isDarkBg ? "text-[#6272a4]" : "text-[#5a5d7a]"
                      }`}
                      style={{ lineHeight: 1.6 }}
                      aria-hidden
                    >
                      {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i} className="min-h-[1.6em]">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  )}
                  <pre
              key={animationKey}
              className={`code-preview-content m-0 font-mono flex-1 min-w-0 ${fontSizeClass} ${
                options.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
              } ${isDarkBg ? "text-[#f8f8f2]" : "text-[#24292f]"}`}
              style={{ lineHeight: 1.6 }}
            >
          {options.animationType === "typing" ? (
            <>
              {tokens.map((t, i) => (
                <span
                  key={i}
                  className={`code-preview-token ${tokenToClassName(t.type)}`}
                  style={runTrigger > 0 ? { opacity: 0 } : undefined}
                >
                  {t.value}
                </span>
              ))}
            </>
          ) : (
            <div className="flex flex-col gap-0 leading-[1.6]">
              {linesWithTokens.map((lineTokens, lineIndex) => (
                <div
                  key={lineIndex}
                  className="code-preview-line block m-0 p-0 leading-[1.6]"
                  style={runTrigger > 0 && options.animationType === "fade" ? { opacity: 0 } : undefined}
                >
                  {lineTokens.map((t, i) => (
                    <span key={i} className={tokenToClassName(t.type)}>
                      {t.value}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
            </pre>
              </div>
            </div>
            </IOSCard>
          ) : (
            <div className="rounded-lg p-4" style={{ backgroundColor: previewBg }}>
              <div className="flex gap-4 items-start">
                {options.showLineNumbers && (
                  <div
                    className={`shrink-0 select-none font-mono ${fontSizeClass} text-right ${isDarkBg ? "text-[#6272a4]" : "text-[#5a5d7a]"}`}
                    style={{ lineHeight: 1.6 }}
                    aria-hidden
                  >
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div key={i} className="min-h-[1.6em]">{i + 1}</div>
                    ))}
                  </div>
                )}
                <pre
                  key={animationKey}
                  className={`code-preview-content m-0 font-mono flex-1 min-w-0 ${fontSizeClass} ${options.wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"} ${isDarkBg ? "text-[#f8f8f2]" : "text-[#24292f]"}`}
                  style={{ lineHeight: 1.6 }}
                >
                  {options.animationType === "typing" ? (
                    <>
                      {tokens.map((t, i) => (
                        <span key={i} className={`code-preview-token ${tokenToClassName(t.type)}`} style={runTrigger > 0 ? { opacity: 0 } : undefined}>
                          {t.value}
                        </span>
                      ))}
                    </>
                  ) : (
                    <div className="flex flex-col gap-0 leading-[1.6]">
                      {linesWithTokens.map((lineTokens, lineIndex) => (
                        <div key={lineIndex} className="code-preview-line block m-0 p-0 leading-[1.6]" style={runTrigger > 0 && options.animationType === "fade" ? { opacity: 0 } : undefined}>
                          {lineTokens.map((t, i) => (
                            <span key={i} className={tokenToClassName(t.type)}>{t.value}</span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemeToggle({
  value,
  onChange,
}: {
  value: PreviewTheme;
  onChange: (v: PreviewTheme) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800/50 p-0.5">
      <button
        type="button"
        onClick={() => onChange("dark")}
        className={`rounded px-2 py-1 text-xs font-medium transition ${
          value === "dark"
            ? "bg-zinc-600 text-white"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
        title="Dracula Dark"
      >
        Dark
      </button>
      <button
        type="button"
        onClick={() => onChange("light")}
        className={`rounded px-2 py-1 text-xs font-medium transition ${
          value === "light"
            ? "bg-zinc-600 text-white"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
        title="Dracula Light"
      >
        Light
      </button>
    </div>
  );
}

function AnimationTypeSelect({
  value,
  onChange,
}: {
  value: PreviewAnimationType;
  onChange: (v: PreviewAnimationType) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PreviewAnimationType)}
      className="rounded border border-zinc-600 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      title="Animation type"
    >
      <option value="typing">Typing</option>
      <option value="fade">Fade reveal</option>
      <option value="highlight">Highlight lines</option>
    </select>
  );
}

function BackgroundColorSelect({
  value,
  onChange,
}: {
  value: PreviewBackgroundColor;
  onChange: (v: PreviewBackgroundColor) => void;
}) {
  const options: { value: PreviewBackgroundColor; label: string }[] = [
    { value: "dracula", label: "Dracula" },
    { value: "draculaBlue", label: "Dracula Blue" },
    { value: "black", label: "Black" },
    { value: "white", label: "White" },
    { value: "gray", label: "Gray" },
    { value: "grayLight", label: "Gray light" },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Bg</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PreviewBackgroundColor)}
        className="rounded border border-zinc-600 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function HighlightLineRange({
  start,
  end,
  lineCount,
  onStartChange,
  onEndChange,
}: {
  start: number;
  end: number;
  lineCount: number;
  onStartChange: (n: number) => void;
  onEndChange: (n: number) => void;
}) {
  const safeStart = Math.max(1, Math.min(start, lineCount));
  const safeEnd = Math.max(1, Math.min(end, lineCount));
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Highlight</span>
      <input
        type="number"
        min={1}
        max={lineCount}
        value={safeStart}
        onChange={(e) => onStartChange(Math.max(1, Math.min(lineCount, e.target.valueAsNumber || 1)))}
        className="w-12 rounded border border-zinc-600 bg-zinc-800/50 px-1 py-1 text-center text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
      />
      <span className="text-zinc-500">–</span>
      <input
        type="number"
        min={1}
        max={lineCount}
        value={safeEnd}
        onChange={(e) => onEndChange(Math.max(1, Math.min(lineCount, e.target.valueAsNumber || 1)))}
        className="w-12 rounded border border-zinc-600 bg-zinc-800/50 px-1 py-1 text-center text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
      />
    </div>
  );
}

function SpeedControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const presets = [
    { label: "Slow", v: 0.5 },
    { label: "Normal", v: 1 },
    { label: "Fast", v: 1.5 },
    { label: "Faster", v: 2 },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Speed</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border border-zinc-600 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {presets.map((p) => (
          <option key={p.v} value={p.v}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function LineNumbersToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span className="text-xs text-zinc-500">Lines</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
      />
    </label>
  );
}

function FontSizeSelect({
  value,
  onChange,
}: {
  value: "small" | "medium" | "large";
  onChange: (v: "small" | "medium" | "large") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Size</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "small" | "medium" | "large")}
        className="rounded border border-zinc-600 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>
    </div>
  );
}

function WordWrapToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span className="text-xs text-zinc-500">Wrap</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
      />
    </label>
  );
}
