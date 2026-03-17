# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All scripts use `NODE_OPTIONS='--require ./node-compat.cjs'` automatically.

```bash
npm run setup       # First-time setup: install deps, generate Prisma client, run migrations
npm run dev         # Start dev server with Turbopack (http://localhost:3000)
npm run dev:daemon  # Start dev server in background, logs to logs.txt
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Vitest (all tests)
npm run db:reset    # Reset SQLite database with fresh migrations
```

To run a single test file: `npx vitest run src/path/to/test.ts`

## Environment

- `ANTHROPIC_API_KEY` (optional): If set, uses Claude Haiku 4.5. If absent, falls back to a `MockLanguageModel` that returns hardcoded demo components.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in natural language; Claude generates files into a virtual (in-memory) file system, and the output is previewed live in a sandboxed iframe.

### Data Flow

1. User types in `ChatInterface` → `ChatProvider` (`useAIChat` hook) POST to `/api/chat`
2. `/api/chat/route.ts` calls Claude via Vercel AI SDK with two tools:
   - `str_replace_editor` — create/view/edit files in the virtual FS
   - `file_manager` — rename/delete files
3. Tool calls stream back to the client and are applied to `FileSystemContext` (in-memory state)
4. `PreviewFrame` reads the virtual FS, transforms JSX with Babel Standalone, builds an import map (ESM.sh for React + third-party libs, blob URLs for local files), and sets `iframe.srcdoc`
5. On completion, if authenticated, the full chat + FS state is serialized to JSON and saved to SQLite via Prisma

### Key Abstractions

| File | Role |
|------|------|
| `src/lib/file-system.ts` | Virtual in-memory file system (no disk I/O). All AI tool operations target this. |
| `src/lib/contexts/file-system-context.tsx` | React context wrapping the virtual FS; bridges AI tool results to UI |
| `src/lib/contexts/chat-context.tsx` | Chat state, calls `/api/chat`, applies tool result side-effects |
| `src/lib/transform/jsx-transformer.ts` | Babel-transforms virtual FS files into browser-runnable JS with import maps |
| `src/components/preview/PreviewFrame.tsx` | Renders output in sandboxed iframe via `srcdoc` |
| `src/lib/provider.ts` | Returns real Anthropic model or `MockLanguageModel` depending on env |
| `src/lib/prompts/generation.tsx` | System prompt for Claude — defines coding conventions for generated components |
| `src/lib/tools/` | Vercel AI SDK tool definitions (`str_replace_editor`, `file_manager`) |
| `src/lib/auth.ts` | JWT sessions (Jose, 7-day expiry, httpOnly cookie `auth-token`) |
| `src/actions/` | Next.js server actions for auth and project CRUD |

### Project Persistence

- **Anonymous users**: state lives only in React context (lost on refresh)
- **Authenticated users**: after each chat turn, messages + serialized FS are stored in `Project.messages` and `Project.data` (both JSON strings in SQLite)

### Generated Component Conventions (enforced via system prompt)

- Entry point must be `/App.jsx`
- Use Tailwind CSS for styling
- Use `@/` alias for local imports
- No HTML files required; the JSX transformer handles mounting

### Database (Prisma + SQLite)

Schema has two models: `User` (email/bcrypt password) and `Project` (belongs to optional user). Prisma client is in `src/generated/prisma/`.

### Testing

Tests live alongside source in `__tests__/` subdirectories. Uses Vitest + jsdom + React Testing Library.
