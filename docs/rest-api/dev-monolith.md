# dev-monolith REST API

## DevMonolithController

### `GET` `api/apidocs/api-viewer.html`

**Metot adı:** `getViewer`

**Yanıt tipi:**

```
undefined | {
  headers: Headers;
  ok: boolean;
  redirected: boolean;
  status: number;
  statusText: string;
  type: "error" | "basic" | "cors" | "default" | "opaque" | "opaqueredirect";
  url: string;
  body: null | {
    locked: boolean;

  };
  bodyUsed: boolean;

} | {
  error: string;

}
```

---

### `GET` `api/apidocs/rest-api.json`

**Metot adı:** `getApiDocs`

**Yanıt tipi:**

```
any
```

---
