# Agent Guide

## Start Here

Read `README.md`, then open the task-relevant document under `docs/architecture/` or `docs/operations/`. Confirm implementation details in source before changing externally visible behavior.

## Repository Shape

- This is a NestJS monorepo: applications live in `apps/`, shared domain packages in `libs/`.
- Package aliases and test configuration are rooted in `tsconfig.json` and `package.json`.
- Keep controller, service, entity, DTO, and module registration changes together when adding a feature.

## Working Rules

- Run the narrowest relevant test, lint, or build target after edits.
- Read `docs/architecture/greenhat-documentation-service.md` before changing Greenhat documents or projects.
- Read `docs/operations/release-and-versions.md` before changing release tooling, Docker manifests, or cross-repository versions.

## MonaXr Library Build Notes

- `patch-libs` compiles each library with its `tsconfig.lib-publish.json` before scanning and copying the output. TypeScript can emit a library's own files under `dist/libs/<library>/libs/<library>/src` when path aliases pull in sibling libraries; XR must scan the actual emitted source directory, not assume `buildSubFolder` always describes it.
- If changing `tools/src/**`, rebuild the generated CLI under `tools/**` before running `npm run xr`. The current `npm run rebuild-xr` may stop on TypeScript 6's deprecated `baseUrl` option in `tools/src/tsconfig.json`.
- A patch success message must follow an awaited copy so filesystem errors are reported by the command.

## Cross-Repository Shared Libraries

This repository owns the `@ubs-platform/*` packages (named `ubs-mona-mr` outside local development). They are consumed by sibling repositories checked out next to it: the public `postralmona` (`postral`) and the private `lotus-web`.

These libraries are not republished to NPM during development. After changing a shared DTO, entity, or exported symbol, rebuild it into each consumer's `node_modules` **from this repository**:

```bash
npm run xr patch-libs ../postralmona/node_modules
npm run xr patch-libs ../lotus-web/node_modules   # only if the private lotus-web checkout exists
```

Skip any target that is not checked out locally; `lotus-web` is private, so most contributors will only need the `postralmona` command. Do this whenever a consumer reports missing exports, missing DTO fields, or stale types after a change here. `postralmona` in turn owns `@tk-postral/*` and must run its own `patch-libs` into `../lotus-web/node_modules` when those packages change.
