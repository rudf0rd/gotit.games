# AGENTS.md

This file provides instructions for AI coding agents working on the gotit.games project.

## Project Overview

**gotit.games** is a video game availability tracker that helps users manage their game subscriptions (Game Pass, PlayStation+, etc.) and avoid buying games they already have access to.

### Tech Stack
- **Runtime/Package Manager**: Bun
- **Frontend**: Vite + Svelte 5 + TypeScript
- **Backend/Database**: Convex (with `convex-svelte`)
- **Authentication**: Clerk (with `svelte-clerk`)
- **Hosting**: Vercel
- **Domain**: gotit.games (Cloudflare DNS)

---

## Development Environment

**Always manage dev processes.** When working on this project:
1. Start Convex dev server: `bun convex dev` (background)
2. Start Vite dev server: `bun dev` (background)
3. Keep both running throughout the session
4. Restart if needed after config changes

The dev site is available at http://localhost:5173

---

## Permissions

### Allowed Without Asking
- Read, search, and explore any files in the codebase
- Run type/svelte checks: `bun check`
- Run linting: `bun lint`
- Run dev server: `bun dev`
- Run Convex dev: `bun convex dev`
- Create and switch git branches
- **Commit changes** using conventional commits
- **Push to remote** on feature branches
- Install packages with `bun add` as needed for implementation

### Ask First
- Push to `main` branch directly
- Delete files or directories
- Run database migrations or destructive Convex operations
- Modify environment variables or secrets
- Change authentication configuration
- Major architectural decisions

---

## Git Conventions

### Conventional Commits (Required)

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Commit Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks, dependencies |
| `ci` | CI/CD changes |

### Examples
```bash
feat(auth): add Steam OpenID authentication
fix(catalog): correct Game Pass API endpoint URL
refactor(subscriptions): extract platform sync logic
chore(deps): update convex to v1.32
```

### Branch Naming
```
feat/short-description
fix/issue-description
refactor/what-is-changing
```

---

## Code Style & Best Practices

### TypeScript
- Use explicit types; avoid `any` (use `unknown` if truly needed)
- Leverage Convex's end-to-end type safety with generated types
- Import `Doc` and `Id` types from `convex/_generated/dataModel`
- Use `as const` for literal types where appropriate

### Svelte 5
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactivity
- Keep components small and focused (< 200 lines)
- Use TypeScript in `<script lang="ts">` blocks
- Colocate styles in component `<style>` blocks
- Use `{#if}`, `{#each}`, `{#await}` blocks appropriately
- Prefer `bind:` for two-way binding when needed

### Convex with Svelte
- Call `setupConvex()` in root layout/component
- Use `useQuery()` from `convex-svelte` for reactive queries
- Use `useConvexClient()` to get client for mutations/actions
- Conditional queries: return `'skip'` from args function to skip
- Reference: [Convex Svelte Docs](https://docs.convex.dev/client/svelte)

### Clerk + Svelte Integration
- Use `svelte-clerk` package for authentication
- Wrap app with Clerk provider
- Use Clerk's Svelte components for sign-in/sign-up UI
- Reference: [svelte-clerk](https://github.com/wobsoriano/svelte-clerk)

---

## Project Structure

```
gotit-games/
├── convex/                    # Convex backend
│   ├── _generated/           # Auto-generated (don't edit)
│   ├── schema.ts             # Database schema
│   ├── auth.config.ts        # Auth provider config
│   ├── users.ts              # User-related functions
│   ├── games.ts              # Game catalog functions
│   ├── subscriptions.ts      # Subscription management
│   └── http.ts               # HTTP endpoints (webhooks)
├── src/
│   ├── lib/                  # Shared utilities & components
│   │   ├── components/       # Reusable Svelte components
│   │   └── platforms/        # Platform API clients
│   ├── routes/               # Page components (if using router)
│   ├── App.svelte            # Root component
│   ├── main.ts               # App entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── svelte.config.js          # Svelte configuration
├── vite.config.ts            # Vite configuration
└── AGENTS.md                 # This file
```

---

## Commands

```bash
# Development
bun dev                  # Start Vite dev server
bun convex dev           # Start Convex dev (run in separate terminal)

# Type checking & linting
bun check                # Svelte + TypeScript check
bun lint                 # ESLint

# Building
bun run build            # Production build

# Convex
bun convex deploy        # Deploy to production
bun convex dashboard     # Open Convex dashboard

# Installing packages
bun add <package>        # Add dependency
bun add -d <package>     # Add dev dependency
```

---

## Environment Variables

Required in `.env.local` (never commit):
```
CONVEX_DEPLOYMENT=dev:xxx
VITE_CONVEX_URL=https://xxx.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx
```

For Vercel deployment, add these in the Vercel dashboard.

---

## Don't

- Don't use `any` type
- Don't hardcode API keys or secrets
- Don't commit `.env.local` or any secrets
- Don't mutate state directly; use Svelte's reactivity system
- Don't skip type checking before commits
- Don't add heavy dependencies without justification
- Don't create components larger than ~200 lines (split them)
- Don't use `$:` reactive statements (Svelte 4 syntax) - use runes instead

---

## External API Integrations

### Steam
- OpenID 2.0 authentication (not OAuth)
- Web API for `GetOwnedGames`
- User profile must be public OR use Publisher API Key

### Xbox Game Pass
- Public catalog API: `https://catalog.gamepass.com`
- No user auth needed for catalog
- User indicates subscription status manually

### PlayStation
- Use [psn-api](https://github.com/achievements-app/psn-api) library
- NPSSO token-based authentication
- Can retrieve purchased games via `getPurchasedGames()`

---

## Resources

- [Svelte 5 Docs](https://svelte.dev/docs/svelte)
- [Convex Docs](https://docs.convex.dev)
- [Convex Svelte](https://docs.convex.dev/client/svelte)
- [svelte-clerk](https://github.com/wobsoriano/svelte-clerk)
- [Conventional Commits](https://www.conventionalcommits.org)
- [Vite](https://vitejs.dev)
