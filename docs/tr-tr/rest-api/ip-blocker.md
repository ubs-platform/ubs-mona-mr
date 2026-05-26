# ip-blocker REST API

## IpBlockerController

### `GET` `ip-blocker`

**Metot adı:** `getHello`

**Yanıt tipi:**

```
string
```

---

### `GET` `ip-blocker/health`

**Metot adı:** `getHealth`

**Yanıt tipi:**

```
{
  status: "ok";
  activeBanCount: number;
  now: string;

}
```

_Kaynak: `apps/ip-blocker/src/ip-blocker.service.ts`_

---

### `GET` `ip-blocker/bans`

**Metot adı:** `getBans`

**Yanıt tipi:**

```
{
  ipAddress: string;
  point: number;
  reason: string;
  penalizedAt: Date;
  releaseAt: Date;
  lastSeenAt: Date;
  status: import("/home/huseyin/dev/tk-ubs/users-mona-mr/apps/ip-blocker/src/model/entity-property.schema").BanStatus;

}[]
```

_Kaynak: `apps/ip-blocker/src/model/entity-property.schema.ts`_

---

### `POST` `ip-blocker/ban`

**Metot adı:** `ban`

**Request body:**

```
{
  ipAddress: undefined | string;
  reason: undefined | string;

}
```

_Kaynak: `apps/ip-blocker/src/ip-blocker.controller.ts`_

**Yanıt tipi:**

```
{
  action: "penalize" | "heaven" | "noop";
  ipAddress: string;
  point: number;
  status: import("/home/huseyin/dev/tk-ubs/users-mona-mr/apps/ip-blocker/src/model/entity-property.schema").BanStatus;
  releaseAt: undefined | {
    getVarDate: () => VarDate;

  };
  reason: string;

}
```

_Kaynak: `apps/ip-blocker/src/ip-blocker.service.ts`_

---

### `POST` `ip-blocker/unban`

**Metot adı:** `unban`

**Request body:**

```
{
  ipAddress: undefined | string;

}
```

_Kaynak: `apps/ip-blocker/src/ip-blocker.controller.ts`_

**Yanıt tipi:**

```
{
  action: "penalize" | "heaven" | "noop";
  ipAddress: string;
  point: number;
  status: import("/home/huseyin/dev/tk-ubs/users-mona-mr/apps/ip-blocker/src/model/entity-property.schema").BanStatus;
  releaseAt: undefined | {
    getVarDate: () => VarDate;

  };
  reason: string;

}
```

_Kaynak: `apps/ip-blocker/src/ip-blocker.service.ts`_

---
