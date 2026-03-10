"use client";

interface IOSCardProps {
  filename?: string;
  account?: string;
  backgroundColor?: string;
  /** When true use light text; when false (light theme) use dark text */
  dark?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function IOSCard({
  filename = "index.ts",
  account = "Code Animator",
  backgroundColor = "#282a36",
  dark = true,
  children,
  className = "",
}: IOSCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-2xl ${className} ${dark ? "border-zinc-600/50" : "border-zinc-300/50"}`}
      style={{
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
        backgroundColor,
      }}
    >
      <div
        className={`flex items-center justify-between gap-3 border-b px-3 py-2 ${dark ? "border-zinc-600/50" : "border-zinc-300/50"}`}
        style={{ backgroundColor }}
      >
        <div className="flex shrink-0 gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className={`flex-1 truncate text-center text-xs font-medium ${dark ? "text-zinc-300" : "text-zinc-700"}`} title={filename}>
          {filename}
        </span>
        <span className={`shrink-0 max-w-[120px] truncate text-right text-[10px] ${dark ? "text-zinc-500" : "text-zinc-600"}`} title={account}>
          {account}
        </span>
      </div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}
