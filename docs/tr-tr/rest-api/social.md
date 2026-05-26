# social REST API

## CommentController

### `POST` `api/comment`

**Metot adı:** `addComment`

**Request body:**

```
{
  _id: undefined | string;
  entityGroup: string;
  mainEntityName: string;
  mainEntityId: string;
  childEntityName: undefined | string;
  childEntityId: undefined | string;
  textContent: string;
  childOfCommentId: undefined | string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

**Yanıt tipi:**

```
{
  _id: string;
  entityGroup: string;
  mainEntityName: string;
  mainEntityId: string;
  childEntityName: string;
  childEntityId: string;
  textContent: string;
  byUserId: string;
  byFullName: string;
  creationDate: {
    getVarDate: () => VarDate;

  };
  lastEditDate: Date;
  editCount: number;
  isChild: undefined | false | true;
  childOfCommentId: undefined | string;
  userDownVoted: boolean;
  userUpVoted: boolean;
  votesLength: number;
  childCommentsCount: number;
  userBanned: boolean;
  commenterIpAddress: string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

---

### `GET` `api/comment`

**Metot adı:** `fetchComments`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `entityGroup` | `string` |
| `mainEntityName` | `string \| undefined` |
| `mainEntityId` | `string \| undefined` |
| `mainEntityIdByOwner` | `boolean \| undefined` |
| `childEntityName` | `string \| undefined` |
| `childEntityId` | `string \| undefined` |
| `childOfCommentId` | `string \| undefined` |
| `contentTextIn` | `string \| undefined` |
| `page` | `number` |
| `size` | `number` |
| `sortBy` | `string \| undefined` |
| `sortRotation` | `"desc" \| "asc" \| undefined` |

**Yanıt tipi:**

```
{
  content: CommentDTO[];
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

### `POST` `api/comment/search`

**Metot adı:** `searchCommentsMultiple`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `page` | `number` |
| `size` | `number` |
| `sortBy` | `string \| undefined` |
| `sortRotation` | `"desc" \| "asc" \| undefined` |

**Request body:**

```
{
  entityGroup: string;
  mainEntityName: undefined | string;
  mainEntityId: undefined | string;
  mainEntityIdByOwner: undefined | false | true;
  childEntityName: undefined | string;
  childEntityId: undefined | string;
  childOfCommentId: undefined | string;
  contentTextIn: undefined | string;

}[]
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

**Yanıt tipi:**

```
{
  content: CommentDTO[];
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

### `GET` `api/comment/count`

**Metot adı:** `commentCount`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `entityGroup` | `string` |
| `mainEntityName` | `string \| undefined` |
| `mainEntityId` | `string \| undefined` |
| `mainEntityIdByOwner` | `boolean \| undefined` |
| `childEntityName` | `string \| undefined` |
| `childEntityId` | `string \| undefined` |
| `childOfCommentId` | `string \| undefined` |
| `contentTextIn` | `string \| undefined` |

**Yanıt tipi:**

```
number
```

---

### `GET` `api/comment/ability`

**Metot adı:** `canComment`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `entityGroup` | `string` |
| `mainEntityName` | `string \| undefined` |
| `mainEntityId` | `string \| undefined` |
| `mainEntityIdByOwner` | `boolean \| undefined` |
| `childEntityName` | `string \| undefined` |
| `childEntityId` | `string \| undefined` |
| `childOfCommentId` | `string \| undefined` |
| `contentTextIn` | `string \| undefined` |

**Yanıt tipi:**

```
{
  userCanComment: boolean;
  userCommentBlockReason: string;
  extraNote: undefined | string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

---

### `GET` `api/comment/ability/:id`

**Metot adı:** `fetch`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `commentId` | `string` |

**Yanıt tipi:**

```
{
  canRemove: boolean;
  canEdit: boolean;
  userCommentAdmin: boolean;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

---

### `GET` `api/comment/status`

**Metot adı:** `commentingStatus`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `entityGroup` | `string` |
| `mainEntityName` | `string \| undefined` |
| `mainEntityId` | `string \| undefined` |

**Yanıt tipi:**

```
{
  status: "ALLOW" | "ARCHIVE" | "DISABLE";

}
```

_Kaynak: `apps/social/src/service/comment-meta.service.ts`_

---

### `GET` `api/comment/block-user`

**Metot adı:** `fetchBlockedUsers`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `entityGroup` | `string` |
| `mainEntityName` | `string \| undefined` |
| `mainEntityId` | `string \| undefined` |

**Yanıt tipi:**

```
{
  username: string;
  primaryEmail: string;
  name: string;
  surname: string;
  id: string;
  suspended: boolean;
  suspendReason: string;
  active: boolean;
  localeCode: string;

}[]
```

_Kaynak: `libs/users-common/src/user-dto.ts`_

---

### `PUT` `api/comment/block-user`

**Metot adı:** `banUser`

**Request body:**

```
{
  entityGroup: string;
  mainEntityName: string;
  mainEntityId: string;
  byUserId: string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

**Yanıt tipi:**

```
void
```

---

### `PUT` `api/comment/unblock-user`

**Metot adı:** `unbanUser`

**Request body:**

```
{
  entityGroup: string;
  mainEntityName: string;
  mainEntityId: string;
  byUserId: string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

**Yanıt tipi:**

```
void
```

---

### `DELETE` `api/comment/:id`

**Metot adı:** `deleteComment`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Yanıt tipi:**

```
void
```

---

### `PUT` `api/comment/status`

**Metot adı:** `setCommentingStatus`

**Request body:**

```
{
  entityGroup: string;
  mainEntityName: undefined | string;
  mainEntityId: undefined | string;

} & {
  newStatus: "ALLOW" | "ARCHIVE" | "DISABLE";

}
```

**Yanıt tipi:**

```
void
```

---

### `PUT` `api/comment/:id`

**Metot adı:** `editComment`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Request body:**

```
{
  textContent: string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

**Yanıt tipi:**

```
{
  _id: string;
  entityGroup: string;
  mainEntityName: string;
  mainEntityId: string;
  childEntityName: string;
  childEntityId: string;
  textContent: string;
  byUserId: string;
  byFullName: string;
  creationDate: {
    getVarDate: () => VarDate;

  };
  lastEditDate: Date;
  editCount: number;
  isChild: undefined | false | true;
  childOfCommentId: undefined | string;
  userDownVoted: boolean;
  userUpVoted: boolean;
  votesLength: number;
  childCommentsCount: number;
  userBanned: boolean;
  commenterIpAddress: string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

---

### `PUT` `api/comment/:id/upvote`

**Metot adı:** `upvote`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Yanıt tipi:**

```
{
  _id: string;
  entityGroup: string;
  mainEntityName: string;
  mainEntityId: string;
  childEntityName: string;
  childEntityId: string;
  textContent: string;
  byUserId: string;
  byFullName: string;
  creationDate: {
    getVarDate: () => VarDate;

  };
  lastEditDate: Date;
  editCount: number;
  isChild: undefined | false | true;
  childOfCommentId: undefined | string;
  userDownVoted: boolean;
  userUpVoted: boolean;
  votesLength: number;
  childCommentsCount: number;
  userBanned: boolean;
  commenterIpAddress: string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

---

### `PUT` `api/comment/:id/downvote`

**Metot adı:** `downvote`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Yanıt tipi:**

```
{
  _id: string;
  entityGroup: string;
  mainEntityName: string;
  mainEntityId: string;
  childEntityName: string;
  childEntityId: string;
  textContent: string;
  byUserId: string;
  byFullName: string;
  creationDate: {
    getVarDate: () => VarDate;

  };
  lastEditDate: Date;
  editCount: number;
  isChild: undefined | false | true;
  childOfCommentId: undefined | string;
  userDownVoted: boolean;
  userUpVoted: boolean;
  votesLength: number;
  childCommentsCount: number;
  userBanned: boolean;
  commenterIpAddress: string;

}
```

_Kaynak: `libs/social-common/src/dto/comment.dto.ts`_

---

## CommentAdminController

### `DELETE` `api/comment/admin/user-id/:userId`

**Metot adı:** `clearCommentsFromThatUserId`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `userId` | `string` |

**Yanıt tipi:**

```
void
```

---

## ApplicationSocialRestrictionController

### `GET` `api/application-social-restriction/admin/:userId/:restriction`

**Metot adı:** `restrictionDetail`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `userId` | `string` |
| `restriction` | `"COMMENT" \| "POST"` |

**Yanıt tipi:**

```
{
  _id: string;
  userId: string;
  restriction: "COMMENT" | "POST";
  until: undefined | string;
  endless: boolean;
  note: string;

}
```

_Kaynak: `libs/social-common/src/dto/application-social-restriction.dto.ts`_

---

### `GET` `api/application-social-restriction/:userId/:restriction`

**Metot adı:** `hasRestriction`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `userId` | `string` |
| `restriction` | `"COMMENT" \| "POST"` |

**Yanıt tipi:**

```
boolean
```

---

### `POST` `api/application-social-restriction/admin`

**Metot adı:** `addRestriction`

**Request body:**

```
{
  userId: string;
  restriction: "COMMENT" | "POST";
  until: undefined | string;
  note: string;

}
```

_Kaynak: `libs/social-common/src/dto/application-social-restriction.dto.ts`_

**Yanıt tipi:**

```
{
  _id: string;
  userId: string;
  restriction: "COMMENT" | "POST";
  until: undefined | string;
  endless: boolean;
  note: string;

}
```

_Kaynak: `libs/social-common/src/dto/application-social-restriction.dto.ts`_

---

### `DELETE` `api/application-social-restriction/admin/:userId/:restriction`

**Metot adı:** `removeRestriction`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `userId` | `string` |
| `restriction` | `"COMMENT" \| "POST"` |

**Yanıt tipi:**

```
void
```

---

## CommentMicroserviceController

_Metot bulunamadı._
