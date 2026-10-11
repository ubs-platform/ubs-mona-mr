# UBS Mona

> ⚠️⚠️ Not Ready For Production - Use at your own risk ⚠️⚠️

> Other UBS Mona repos about to be migrated here. After the migration, other repositories will be archived

## Synopsis

UBS Mona is a rest API framework developed around NestJS, which aims to develop low code backend, and mostly uses MongoDB. It includes very basic functions such as User Login/Logout, socialization (commenting), notification. The name Mona is formed by combining the names "MOngo, Nest, Angular"

## Detailed documentations

- [English US 🇺🇸](./docs/en-us/README.md)
- [Turkish 🇹🇷](./docs/tr-tr/README.md)

## Engine5 Message IDs

The [Engine5 connection](./libs/microservice-setup-util/src/engine5/connection.ts)
generates UUID v4 `MessageId` values for requests, responses, listen commands, and
events using Node's `crypto.randomUUID()`. Responses retain the request ID in
`ResponseOfMessageId`; event consumption success/error messages retain the event
ID in `MessageId` for log correlation. Incoming legacy string IDs remain supported.
