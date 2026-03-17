import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// str_replace_editor
// ---------------------------------------------------------------------------

test("str_replace_editor create shows 'Creating <filename>'", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("str_replace_editor str_replace shows 'Editing <filename>'", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/components/Button.tsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("str_replace_editor insert shows 'Editing <filename>'", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/utils/helpers.ts" }}
      state="result"
    />
  );
  expect(screen.getByText("Editing helpers.ts")).toBeDefined();
});

test("str_replace_editor view shows 'Reading <filename>'", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Reading App.jsx")).toBeDefined();
});

test("str_replace_editor undo_edit shows 'Reverting <filename>'", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "undo_edit", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Reverting App.jsx")).toBeDefined();
});

test("str_replace_editor with no path shows 'Working…'", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{}}
      state="partial-call"
    />
  );
  expect(screen.getByText("Working…")).toBeDefined();
});

// ---------------------------------------------------------------------------
// file_manager
// ---------------------------------------------------------------------------

test("file_manager delete shows 'Deleting <filename>'", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/old/Component.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Deleting Component.jsx")).toBeDefined();
});

test("file_manager rename shows 'Renaming <file> → <newfile>'", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/Foo.jsx", new_path: "/Bar.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Renaming Foo.jsx → Bar.jsx")).toBeDefined();
});

test("file_manager rename without new_path shows 'Renaming <filename>'", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/Foo.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Renaming Foo.jsx")).toBeDefined();
});

test("file_manager with no path shows 'Working…'", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{}}
      state="partial-call"
    />
  );
  expect(screen.getByText("Working…")).toBeDefined();
});

// ---------------------------------------------------------------------------
// Unknown tool
// ---------------------------------------------------------------------------

test("unknown tool falls back to the tool name", () => {
  render(
    <ToolInvocationBadge
      toolName="some_other_tool"
      args={{}}
      state="result"
    />
  );
  expect(screen.getByText("some_other_tool")).toBeDefined();
});

// ---------------------------------------------------------------------------
// State indicators
// ---------------------------------------------------------------------------

test("shows spinner when state is 'call'", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows spinner when state is 'partial-call'", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="partial-call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("shows green dot when state is 'result'", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

// ---------------------------------------------------------------------------
// Path extraction
// ---------------------------------------------------------------------------

test("extracts only the filename from a deeply nested path", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/components/ui/Badge.tsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Creating Badge.tsx")).toBeDefined();
});
