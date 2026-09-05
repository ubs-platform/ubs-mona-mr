# Release and Version Notes

## Multi-Architecture Images

The deploy-version workflow publishes `linux/amd64`, `linux/arm64`, and `linux/arm/v7` separately. Set `DOCKER_PUSH_BY_PLATFORM=1` for `tools/release-app.sh`; `tools/publish-all-manifests.sh` then creates the canonical multi-platform image manifest. Platform-specific registry caches prevent concurrent builds from overwriting one shared cache.

## Docker Package Manifests

Release scripts create a temporary ignored `package.docker.json`, stripping version-related fields before the build. Dockerfiles copy that file so a version-only change does not invalidate the `npm ci` layer. The release script removes it on exit.

## Versions

`tools/update-versions.sh` updates only `ENGINE5_VERSION` because this repository produces the `@ubs-platform` packages. When modifying dependencies, use exact package names collected from the relevant repository's `libs/*/package.json`, not a scope-wide match. Image tag suffix behavior is controlled by root `package.json` `iksir.childrenVersionTag`.
