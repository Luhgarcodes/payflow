# ADR 0001: TypeScript setup

- Status: Accepted
- Date: 2026-10-13

## Context

PayFlow moves money, so type errors that reach production are expensive. The codebase is already written in strict TypeScript; this ADR records how it is compiled and run, and which gates keep it strict as it grows.

## Decision

**Module output: CommonJS.** `tsconfig.json` uses `module` and `moduleResolution` set to `nodenext`. `package.json` has no `"type": "module"`, so `tsc` emits CommonJS. This avoids ESM friction with Sequelize, Umzug and Jest, and lets imports omit file extensions.

**Development: `tsx`.** `npm run dev` runs `tsx watch src/server.ts`, which strips types with esbuild and restarts on change. The migration CLI (`npm run db:*`) also runs through `tsx`. `tsx` does not type-check.

**Builds: `tsc`.** `npm run build` compiles `src/` to `dist/` with source maps, and production runs `node dist/server.js`.

**Compiler strictness.** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` and `isolatedModules` are enabled.

**Type-safety gates.**

- `npm run typecheck` (`tsc --noEmit`) runs in CI before tests and blocks merges.
- ESLint uses typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`, and treats `no-explicit-any`, `no-non-null-assertion` and `no-floating-promises` as errors.
- `process.env` may only be read in `src/config`.

**Shared domain types.** Roles, KYC tiers, transaction statuses and branded IDs (for example `UserId`) live in `src/types/domain.ts`. Models and services import them instead of redeclaring string unions. Branded IDs are created only through checked guards such as `isUserId`, never through `as` casts. Migrations keep literal enum values so they stay frozen at the point they were written.

## Consequences

- Because `tsx` skips type checking, a type error will not stop `npm run dev`. The CI typecheck is the gate, and developers should run `npm run typecheck` locally before pushing.
- Two toolchains (esbuild through `tsx`, and `tsc`) must agree on module semantics. `isolatedModules` keeps code compatible with per-file transpilation.
- Moving to ESM later would mean adding `"type": "module"`, adding file extensions to relative imports, and re-checking tooling compatibility. That would need a new ADR.
