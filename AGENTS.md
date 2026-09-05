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
