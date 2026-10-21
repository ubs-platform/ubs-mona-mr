# UBS Mona

> ⚠️⚠️ Not Ready For Production - Use at your own risk ⚠️⚠️

> Other UBS Mona repos about to be migrated here. After the migration, other repositories will be archived

## Synopsis

UBS Mona is a rest API framework developed around NestJS, which aims to develop low code backend, and mostly uses MongoDB. It includes very basic functions such as User Login/Logout, socialization (commenting), notification. The name Mona is formed by combining the names "MOngo, Nest, Angular"

## Detailed documentations

- [English US 🇺🇸](./docs/en-us/README.md)
- [Turkish 🇹🇷](./docs/tr-tr/README.md)

## Retry-safe team provisioning

`EntityOwnershipGroupCommonDTO.creationKey` is an optional create-retry key.
It is hashed together with the creating user ID and persisted under a sparse
unique Mongo index. Identical retries return the same group, including after a
lost response or concurrent duplicate insert. Reusing a key with different
name/description/initial capabilities is rejected. Calls without a key keep
their original create semantics; the supplied DTO `id` is still not a create
idempotency mechanism. The users service ensures the creation-key index at
startup; existing groups without a key remain valid.

Trusted consumers can use
`EntityOwnershipService.ensureTeamOwnership()` / `ensure-team-ownership` to
await a persisted team assignment. It uses an atomic insert-if-missing against
the existing entity identity unique index, acknowledges an identical assignment,
and refuses to overwrite another team's or a person's ownership. The legacy
`insertOwnership()` event API is unchanged. Postral first-run setup depends on
the acknowledged command; deploy users before the updated payment service.
Rebuild shared libraries from this repository with `npm run xr patch-libs`
for each consumer after these contract/helper changes.

## Engine5 Message IDs

The [Engine5 connection](./libs/microservice-setup-util/src/engine5/connection.ts)
generates UUID v4 `MessageId` values for requests, responses, listen commands, and
events using Node's `crypto.randomUUID()`. Responses retain the request ID in
`ResponseOfMessageId`; event consumption success/error messages retain the event
ID in `MessageId` for log correlation. Incoming legacy string IDs remain supported.
