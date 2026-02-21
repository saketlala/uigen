# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates them using a virtual filesystem, with real-time preview and code editing.

## Commands

```bash
npm run setup       # First-time setup: install deps + Prisma generate + DB migrations
npm run dev         # Dev server with Turbopack (localhost:3000)
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Vitest (all tests)
npm run db:reset    # Reset SQLite database (destructive)
```

To run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

## Environment

Copy `.env` and set `ANTHROPIC_API_KEY`. If the key is absent, the app falls back to a `MockLanguageModel` in `src/lib/provider.ts` that generates static demo components.

Prisma client is generated into `src/generated/prisma` (not `node_modules/@prisma/client`). Import from `@/generated/prisma`.

## Architecture

### Key Abstractions

**Virtual File System** (`src/lib/file-system.ts`): An in-memory filesystem — no disk writes. Files are serialized to JSON and stored in the `Project.data` DB column. All generated component code lives here.

**FileSystemContext** (`src/lib/contexts/file-system-context.tsx`): React context wrapping the virtual FS. Exposes CRUD operations; auto-selects `App.jsx` on load.

**ChatContext** (`src/lib/contexts/chat-context.tsx`): React context managing AI chat state via Vercel AI SDK `useChat`. Handles streaming tool call results, persists messages + file system state to the DB after each turn.

### AI Integration

- **Route**: `src/app/api/chat/route.ts` — receives chat history + serialized file system, calls Claude with up to 40 steps and 10,000 max tokens.
- **Tools**: `str_replace_editor` (`src/lib/tools/str-replace.ts`) for file edits, `file_manager` (`src/lib/tools/file-manager.ts`) for rename/delete.
- **System prompt**: `src/lib/prompts/generation.tsx` — instructs Claude to always create `/App.jsx` as the entry point and use only Tailwind CSS.

### Preview

`PreviewFrame.tsx` renders generated components inside an iframe using `@babel/standalone` for client-side JSX transformation. It re-renders whenever the virtual file system changes.

### Auth

JWT sessions via `jose` stored in HTTP-only cookies. `src/lib/auth.ts` contains `createSession`/`verifySession`. Server actions in `src/actions/index.ts` handle sign-up/sign-in/sign-out. Anonymous users can generate components; projects are optionally associated with a `userId`.

### Data Model

The authoritative schema is in `prisma/schema.prisma` — refer to it whenever you need to understand the structure of data stored in the database. Key points:

- `User`: email/password auth; owns zero or more `Project` records.
- `Project.messages`: JSON-serialized chat history array.
- `Project.data`: JSON-serialized `VirtualFileSystem` state (the generated files).
- `Project.userId` is optional — anonymous users can have projects not tied to an account.

### UI Layout

Three-panel layout (via `react-resizable-panels`):
- **Left** (~35%): Chat panel (`ChatInterface`, `MessageList`, `MessageInput`)
- **Right** (~65%): Tabs switching between live Preview (`PreviewFrame`) and Code view (`FileTree` + `CodeEditor` with Monaco)

### Path Alias

`@/` maps to `src/`. Used throughout — e.g. `import { VirtualFileSystem } from '@/lib/file-system'`.
