"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "partial-call" | "result";
}

function getDescription(toolName: string, args: Record<string, unknown>): string {
  const path = args.path as string | undefined;
  const filename = path ? (path.split("/").filter(Boolean).pop() ?? path) : null;

  if (toolName === "str_replace_editor") {
    if (!filename) return "Working…";
    const command = args.command as string | undefined;
    switch (command) {
      case "create":     return `Creating ${filename}`;
      case "str_replace":
      case "insert":     return `Editing ${filename}`;
      case "view":       return `Reading ${filename}`;
      case "undo_edit":  return `Reverting ${filename}`;
      default:           return `Updating ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    if (!filename) return "Working…";
    const command = args.command as string | undefined;
    if (command === "delete") return `Deleting ${filename}`;
    if (command === "rename") {
      const newPath = args.new_path as string | undefined;
      const newFilename = newPath ? (newPath.split("/").filter(Boolean).pop() ?? newPath) : null;
      return newFilename ? `Renaming ${filename} → ${newFilename}` : `Renaming ${filename}`;
    }
    return `Updating ${filename}`;
  }

  return toolName;
}

export function ToolInvocationBadge({ toolName, args, state }: ToolInvocationBadgeProps) {
  const isPending = state !== "result";
  const description = getDescription(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
      ) : (
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      )}
      <span className="text-neutral-700">{description}</span>
    </div>
  );
}
