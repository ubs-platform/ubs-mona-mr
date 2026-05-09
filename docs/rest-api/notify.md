# notify REST API

## EmailTemplateController

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

## GlobalVariableController

### `GET` `api/global-variable`

**Metot adı:** `fetchAll`

**Yanıt tipi:**

```
{
  id: string;
  name: string;
  values: {
    language: string;
    value: string;

  }[];

}[]
```

_Kaynak: `libs/notify-common/src/lib/dto/global-variable.ts`_

---

### `PUT` `api/global-variable`

**Metot adı:** `edit`

**Request body:**

```
{
  name: string;
  language: string;
  value: string;

}
```

_Kaynak: `libs/notify-common/src/lib/dto/global-variable-write.dto.ts`_

**Yanıt tipi:**

```
null | {
  id: string;
  name: string;
  values: {
    language: string;
    value: string;

  }[];

}
```

---

### `PUT` `api/global-variable/rename`

**Metot adı:** `renameTo`

**Request body:**

```
{
  _id: string;
  name: string;

}
```

_Kaynak: `libs/notify-common/src/lib/dto/global-variable-rename.ts`_

**Yanıt tipi:**

```
null | {
  id: string;
  name: string;
  values: {
    language: string;
    value: string;

  }[];

}
```

---

### `PUT` `api/global-variable/dublicate`

**Metot adı:** `dublicate`

**Request body:**

```
{
  id: any;

}
```

_Kaynak: `apps/notify/src/app/controller/global-variable.controller.ts`_

**Yanıt tipi:**

```
null | {
  id: string;
  name: string;
  values: {
    language: string;
    value: string;

  }[];

}
```

---

## EmailController

### `POST` `api/email`

**Metot adı:** `sendEmail`

**Request body:**

```
{
  to: string;
  subject: string;
  templateName: string;
  specialVariables: any;
  language: undefined | string;

}
```

_Kaynak: `libs/notify-common/src/lib/dto/email.dto.ts`_

**Yanıt tipi:**

```
void
```

---
