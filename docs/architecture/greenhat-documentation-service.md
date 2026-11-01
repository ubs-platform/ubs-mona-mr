# Greenhat Documentation Service

## Modules and Integration

- `libs/greenhat-entity-mongo` owns the Mongo entities and module.
- `libs/greenhat-common` owns DTOs.
- `libs/greenhat-webservice` owns controllers and services.
- The webservice module is registered by `apps/dev-monolith/src/dev-monolith.module.ts`.

## Domain Rules

- `DocProject.slug` is unique. Project access is represented by ownership entries using `GREENHAT` and `PROJECT`; create assigns OWNER to its creator.
- A `DocArticle` belongs to a project and stores `parentId`, `ancestors`, order, slug, and a case-insensitive project-scoped name (`nameLower`).
- Localized titles and content are maps keyed by locale. Locale keys use lowercase `ll-cc` format.
- Non-admin project lists are limited to owned project IDs. Deactivated projects and documents are hidden by default.
- Parent documents must belong to the same project. Stored slug paths do not change when a document is renamed.

## API Behavior

- Project CRUD is exposed at `/greenhat/project`; deletion is a soft delete.
- Documents support add, rename, removal, content updates, and tree listing under `/greenhat/document`.
- A root list uses `parentId = null`; providing `parentId` lists that node's children.
- Content updates are locale-specific and currently accept `text` content only.
- Removing a document recursively soft-deletes descendants. The dry-run endpoint reports direct child, descendant, and total counts.

## Blog

- `DocBlogPost` (`doc_blog_posts`) is independent of projects and documents. It stores a unique active `slug` (timestamp by default), `status` (`draft`/`published`), `publishedAt`, `defaultLocale`, `titlesByLocale`, and `contentsByLocale[locale].markdown`.
- Admin endpoints under `/greenhat/blog/admin` require the `ADMIN` role: list, get, create, update (full replacement of translations), `PUT :id/publish` with `{ published }`, and soft delete.
- Public endpoints under `/greenhat/blog/public` need no authentication and expose only published, active posts: a paged list with excerpts and `public/:slug?locale=`. A missing locale falls back to the default locale, then to any locale with content.
- Publishing requires non-empty markdown in the default locale. `publishedAt` is set on the first publish and kept afterwards.
- Slugs match `^[a-z0-9]+(?:-[a-z0-9]+)*$`; locale keys use `ll-cc`. Tags and a `blogKey` for multiple blogs are not implemented yet.
