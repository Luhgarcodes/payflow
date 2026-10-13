# ADR 0001: TypeScript setup

- Status: Accepted
- Date: 2026-10-13

## Context

PayFlow moves money, so type errors that reach production are expensive. The codebase is already written in strict TypeScript; this ADR records how it is compiled and run, and which gates keep it strict as it grows.

## Decision

**Module output: CommonJS.** `tsconfig.json` uses `module` and `moduleResolution` set to `nodenext`. `package.json` has no `"type": "module"`, so `tsc` emits CommonJS. This avoids ESM friction with Sequelize, Umzug and Jest, and lets imports omit file extensions.

**Development: `tsx`.** `npm run dev` runs `tsx watch src/server.ts`, which strips types with esbuild and restarts on change. The migration CLI (`npm run db:*`) also runs through `tsx`. `tsx` does not type-check.

**Builds: `tsc`.** `npm run build` compiles `src/` to `dist/` with source maps using `tsconfig.build.json`, which excludes test files. Production runs `node dist/server.js`. `tsconfig.json` also covers `tests/`, so `npm run typecheck` checks tests too.

**Tests: Jest with `@swc/jest`.** SWC strips types without checking them, which keeps the suite fast. Type errors in tests are caught by `npm run typecheck`, which runs before tests in CI.

**Compiler strictness.** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` and `isolatedModules` are enabled.

**Type-safety gates.**

- `npm run typecheck` (`tsc --noEmit`) runs in CI before tests on every push and PR.
- ESLint uses typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`, and treats `no-explicit-any`, `no-non-null-assertion` and `no-floating-promises` as errors.
- `process.env` may only be read in `src/config`.

**Shared domain types.** Roles, KYC tiers, transaction statuses and branded IDs (for example `UserId`) live in `src/types/domain.ts`. Models and services import them instead of redeclaring string unions. Branded IDs are Zod brands (`userIdSchema`), so the only way to get a `UserId` is to validate a value, never an `as` cast. Request handlers are typed from their Zod schemas through `ValidatedHandler`. Migrations keep literal enum values so they stay frozen at the point they were written.

## Consequences

- Because `tsx` skips type checking, a type error will not stop `npm run dev`. The CI typecheck is the gate, and developers should run `npm run typecheck` locally before pushing.
- Migrations and seeders are TypeScript loaded through `tsx`, so they run from source, not from `dist/`. Deployments must run `npm run db:migrate` from a checkout with dev dependencies installed, or this needs revisiting.
- Three toolchains (esbuild through `tsx`, SWC through Jest, and `tsc`) must agree on module semantics. `isolatedModules` keeps code compatible with per-file transpilation.
- Moving to ESM later would mean adding `"type": "module"`, adding file extensions to relative imports, and re-checking tooling compatibility. That would need a new ADR.
