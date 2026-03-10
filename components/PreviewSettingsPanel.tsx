"use client";

import type {
  CodePreviewOptions,
  PreviewTheme,
  PreviewAnimationType,
  PreviewBackgroundColor,
} from "@/components/CodePreview";

const BACKGROUND_OPTIONS: { value: PreviewBackgroundColor; label: string }[] = [
  { value: "dracula", label: "Dracula" },
  { value: "draculaBlue", label: "Dracula Blue" },
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "gray", label: "Gray" },
  { value: "grayLight", label: "Gray light" },
];

const selectClass =
  "rounded border-0 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 ring-1 ring-zinc-600/50 focus:ring-1 focus:ring-emerald-500";
const inputClass =
  "w-10 rounded bg-transparent py-0.5 text-center text-xs text-zinc-200 ring-1 ring-zinc-600/50 focus:outline-none focus:ring-1 focus:ring-emerald-500";

interface PreviewSettingsPanelProps {
  options: CodePreviewOptions;
  lineCount: number;
  onOptionsChange: (next: Partial<CodePreviewOptions>) => void;
  variant: "editor" | "preview";
}

export function PreviewSettingsPanel({
  options,
  lineCount,
  onOptionsChange,
  variant,
}: PreviewSettingsPanelProps) {
  const set = (next: Partial<CodePreviewOptions>) => onOptionsChange(next);
  const isHighlight = options.animationType === "highlight";

  if (variant === "editor") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {isHighlight && (
          <span className="text-[10px] text-zinc-500 italic">
            Click line numbers to set range
          </span>
        )}
        <div className="flex rounded-lg bg-zinc-900/80 p-0.5 ring-1 ring-zinc-600/50">
          <button
            type="button"
            onClick={() => set({ theme: "dark" })}
            className={`rounded px-2 py-1 text-xs font-medium ${
              options.theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => set({ theme: "light" })}
            className={`rounded px-2 py-1 text-xs font-medium ${
              options.theme === "light" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Light
          </button>
        </div>
        <select
          value={options.animationType}
          onChange={(e) => set({ animationType: e.target.value as PreviewAnimationType })}
          className={selectClass}
        >
          <option value="typing">Typing</option>
          <option value="fade">Fade</option>
          <option value="highlight">Highlight</option>
        </select>
        <select
          value={options.speed}
          onChange={(e) => set({ speed: Number(e.target.value) })}
          className={selectClass}
        >
          <option value={0.5}>Slow</option>
          <option value={1}>Normal</option>
          <option value={1.5}>Fast</option>
          <option value={2}>Faster</option>
        </select>
        {isHighlight && (
          <div className="flex items-center gap-1 rounded-lg bg-zinc-900/60 px-2 py-1 ring-1 ring-zinc-600/50">
            <input
              type="number"
              min={1}
              max={lineCount}
              value={Math.max(1, Math.min(options.highlightLineStart, lineCount))}
              onChange={(e) =>
                set({ highlightLineStart: Math.max(1, Math.min(lineCount, e.target.valueAsNumber || 1)) })
              }
              className={inputClass}
            />
            <span className="text-zinc-500">–</span>
            <input
              type="number"
              min={1}
              max={lineCount}
              value={Math.max(1, Math.min(options.highlightLineEnd, lineCount))}
              onChange={(e) =>
                set({ highlightLineEnd: Math.max(1, Math.min(lineCount, e.target.valueAsNumber || 1)) })
              }
              className={inputClass}
            />
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={options.showLineNumbers}
            onChange={(e) => set({ showLineNumbers: e.target.checked })}
            className="h-3 w-3 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
          />
          <span className="text-xs text-zinc-400">Lines</span>
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500">Bg</span>
      <select
        value={options.backgroundColor}
        onChange={(e) => set({ backgroundColor: e.target.value as PreviewBackgroundColor })}
        className={selectClass}
      >
        {BACKGROUND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="text-xs text-zinc-500">Size</span>
      <select
        value={options.fontSize}
        onChange={(e) =>
          set({
            fontSize: e.target.value as "small" | "medium" | "large" | "xlarge",
          })
        }
        className={selectClass}
      >
        <option value="small">S</option>
        <option value="medium">M</option>
        <option value="large">L</option>
        <option value="xlarge">XL</option>
      </select>
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={options.wordWrap}
          onChange={(e) => set({ wordWrap: e.target.checked })}
          className="h-3 w-3 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
        />
        <span className="text-xs text-zinc-400">Wrap</span>
      </label>
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={options.iosCardMode}
          onChange={(e) => set({ iosCardMode: e.target.checked })}
          className="h-3 w-3 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
        />
        <span className="text-xs text-zinc-400">iOS card</span>
      </label>
      {options.iosCardMode && (
        <>
          <input
            type="text"
            value={options.iosCardFilename ?? "index.ts"}
            onChange={(e) => set({ iosCardFilename: e.target.value || "index.ts" })}
            placeholder="Filename"
            className="w-20 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200 placeholder:text-zinc-500 ring-1 ring-zinc-600/50 focus:ring-1 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={options.iosCardAccount ?? ""}
            onChange={(e) => set({ iosCardAccount: e.target.value })}
            placeholder="Account"
            className="w-24 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200 placeholder:text-zinc-500 ring-1 ring-zinc-600/50 focus:ring-1 focus:ring-emerald-500"
          />
        </>
      )}
    </div>
  );
}
