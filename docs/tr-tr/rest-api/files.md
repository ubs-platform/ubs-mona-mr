# files REST API

## ImageFileController

### `PUT` `api/file/volatility`

**Metot adı:** `applyVolatilities`

**Request body:**

```
{
  name: string;
  category: string;
  volatile: boolean;
  durationMiliseconds: number;

}[]
```

_Kaynak: `apps/files/src/dto/file-volatile-tag.ts`_

**Yanıt tipi:**

```
void
```

---

### `PUT` `api/file/:type/:objectId`

**Metot adı:** `uploadFile`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `type` | `string` |
| `objectId` | `string \| undefined` |

**Yanıt tipi:**

```
{
  category: string;
  name: string;

}
```

_Kaynak: `apps/files/src/controller/file.controller.ts`_

---

### `PUT` `api/file/:type`

**Metot adı:** `uploadFileOnlyType`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `type` | `string` |
| `objectId` | `string \| undefined` |

**Yanıt tipi:**

```
{
  category: string;
  name: string;

}
```

_Kaynak: `apps/files/src/controller/file.controller.ts`_

---

### `GET` `api/file/:category/:objectId/exist`

**Metot adı:** `hasFile`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `category` | `string` |
| `objectId` | `string` |

**Yanıt tipi:**

```
any
```

---

### `GET` `api/file/:category/:name`

**Metot adı:** `fetchFileContent`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `category` | `string` |
| `name` | `string` |

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `width` | `string \| number \| null \| undefined` |

**Yanıt tipi:**

```
never
```

---

## EntityPropertyController

_Metot bulunamadı._
