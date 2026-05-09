# feedback REST API

## UserMessageController

### `POST` `api/user-message/:id/resolve`

**Metot adı:** `resolve`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Request body:**

```
{
  reply: string;

}
```

_Kaynak: `apps/feedback/src/app/controller/user-messages.controller.ts`_

**Yanıt tipi:**

```
{
  _id: any;
  firstName: undefined | string;
  lastName: undefined | string;
  email: string;
  message: undefined | string;
  fileUrls: undefined | import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/feedback-common/src/lib/dto/filemeta.dto").IFileMetaDto[];
  type: undefined | string;
  phoneNumber: undefined | string;
  summary: undefined | string;
  creationDate: undefined | {
    getVarDate: () => VarDate;

  };
  status: undefined | "WAITING" | "RESOLVED";
  reply: undefined | string;
  relatedUrl: undefined | string;
  localeCode: undefined | string;

}
```

_Kaynak: `libs/feedback-common/src/lib/dto/user-message.dto.ts`_

---

### `GET` `api`

**Metot adı:** `fetchAll`

**Yanıt tipi:**

```
OUTPUT[]
```

_Kaynak: `libs/crud-base/src/base-crud-controller.ts`_

---

### `GET` `api/_search`

**Metot adı:** `search`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `s` | `SEARCH & import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/crud-base-common/src/search-request").SearchRequest` |

**Yanıt tipi:**

```
{
  content: OUTPUT[];
  page: number;
  size: number;
  maxItemLength: number;
  maxPagesIndex: number;
  lastPage: boolean;
  firstPage: boolean;

}
```

_Kaynak: `libs/crud-base-common/src/search-result.ts`_

---

### `GET` `api/:id`

**Metot adı:** `fetchOne`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `any` |

**Yanıt tipi:**

```
OUTPUT
```

_Kaynak: `libs/crud-base/src/base-crud-controller.ts`_

---

### `POST` `api`

**Metot adı:** `add`

**Request body:**

```
INPUT
```

_Kaynak: `libs/crud-base/src/base-crud-controller.ts`_

**Yanıt tipi:**

```
OUTPUT
```

_Kaynak: `libs/crud-base/src/base-crud-controller.ts`_

---

### `PUT` `api`

**Metot adı:** `edit`

**Request body:**

```
INPUT
```

_Kaynak: `libs/crud-base/src/base-crud-controller.ts`_

**Yanıt tipi:**

```
OUTPUT
```

_Kaynak: `libs/crud-base/src/base-crud-controller.ts`_

---

### `DELETE` `api/:id`

**Metot adı:** `remove`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `any` |

**Yanıt tipi:**

```
OUTPUT
```

_Kaynak: `libs/crud-base/src/base-crud-controller.ts`_

---
