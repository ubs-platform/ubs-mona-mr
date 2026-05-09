# users REST API

## UserController

### `PUT` `api/user/current/general`

**Metot adı:** `updateGeneralUserInformation`

**Request body:**

```
{
  id: undefined | string;
  name: string;
  surname: string;
  gender: string;
  pronounce: string;
  webSites: string[];
  country: string;
  state: string;
  city: string;
  district: string;
  localeCode: string;
  username: string;

}
```

_Kaynak: `libs/users-common/src/user-general-info-dto.ts`_

**Yanıt tipi:**

```
void
```

---

### `GET` `api/user/current/general`

**Metot adı:** `fetchGeneralUserInformation`

**Yanıt tipi:**

```
{
  id: undefined | string;
  name: string;
  surname: string;
  gender: string;
  pronounce: string;
  webSites: string[];
  country: string;
  state: string;
  city: string;
  district: string;
  localeCode: string;
  username: string;

}
```

_Kaynak: `libs/users-common/src/user-general-info-dto.ts`_

---

### `PUT` `api/user/current/email`

**Metot adı:** `changeEmail`

**Request body:**

```
{
  email: string;

}
```

_Kaynak: `apps/users/src/web/user.controller.ts`_

**Yanıt tipi:**

```
{
  approveId: string;

}
```

_Kaynak: `apps/users/src/services/email-change-request.service.ts`_

---

### `POST` `api/user/current/email/:id`

**Metot adı:** `approveChangeEmail`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `any` |

**Request body:**

```
{
  code: string;

}
```

_Kaynak: `apps/users/src/web/user.controller.ts`_

**Yanıt tipi:**

```
void
```

---

### `PUT` `api/user/current/password`

**Metot adı:** `changePassword`

**Request body:**

```
{
  currentPassword: string;
  newPassword: string;

}
```

_Kaynak: `apps/users/src/web/user.controller.ts`_

**Yanıt tipi:**

```
void
```

---

## AuthController

### `POST` `api/auth`

**Metot adı:** `authenticate`

**Request body:**

```
{
  login: string;
  password: string;

}
```

_Kaynak: `libs/users-common/src/user-auth.model.ts`_

**Yanıt tipi:**

```
{
  token: undefined | string;
  success: boolean;
  message: string;

}
```

_Kaynak: `libs/users-common/src/user-auth-status.model.ts`_

---

### `GET` `api/auth`

**Metot adı:** `getSelfUser`

**Yanıt tipi:**

```
any
```

---

### `POST` `api/auth/has-role`

**Metot adı:** `hasRole`

**Request body:**

```
string[]
```

**Yanıt tipi:**

```
boolean
```

---

### `POST` `api/auth/logout`

**Metot adı:** `logout`

**Yanıt tipi:**

```
void
```

---

## UserAdminController

### `GET` `api/_adm_/user`

**Metot adı:** `listAllUsers`

**Yanıt tipi:**

```
null | {
  username: string;
  primaryEmail: string;
  name: string;
  surname: string;
  id: string;
  suspended: boolean;
  suspendReason: string;
  roles: string[];
  localeCode: string;
  active: boolean;

}[]
```

---

### `GET` `api/_adm_/user/_search`

**Metot adı:** `searchAllUsers`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `name` | `string` |
| `username` | `string` |
| `page` | `number` |
| `size` | `number` |
| `sortBy` | `string \| undefined` |
| `sortRotation` | `"desc" \| "asc" \| undefined` |

**Yanıt tipi:**

```
{
  content: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/user-admin-dto").UserAuthBackendDTO | null[];
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

### `GET` `api/_adm_/user/:id`

**Metot adı:** `fetchFull`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `any` |

**Yanıt tipi:**

```
{
  _id: any;
  username: string;
  primaryEmail: string;
  name: string;
  surname: string;
  country: string;
  state: string;
  city: string;
  district: string;
  gender: string;
  pronounce: string;
  roles: string[];
  webSites: string[];
  active: boolean;
  suspended: boolean;
  suspendReason: string;
  password: undefined | string;
  localeCode: string;

}
```

_Kaynak: `libs/users-common/src/user-full-dto.ts`_

---

### `PUT` `api/_adm_/user`

**Metot adı:** `updateUser`

**Request body:**

```
{
  _id: any;
  username: string;
  primaryEmail: string;
  name: string;
  surname: string;
  country: string;
  state: string;
  city: string;
  district: string;
  gender: string;
  pronounce: string;
  roles: string[];
  webSites: string[];
  active: boolean;
  suspended: boolean;
  suspendReason: string;
  password: undefined | string;
  localeCode: string;

}
```

_Kaynak: `libs/users-common/src/user-full-dto.ts`_

**Yanıt tipi:**

```
void
```

---

### `POST` `api/_adm_/user`

**Metot adı:** `createUser`

**Request body:**

```
{
  _id: any;
  username: string;
  primaryEmail: string;
  name: string;
  surname: string;
  country: string;
  state: string;
  city: string;
  district: string;
  gender: string;
  pronounce: string;
  roles: string[];
  webSites: string[];
  active: boolean;
  suspended: boolean;
  suspendReason: string;
  password: undefined | string;
  localeCode: string;

}
```

_Kaynak: `libs/users-common/src/user-full-dto.ts`_

**Yanıt tipi:**

```
void
```

---

### `DELETE` `api/_adm_/user/:id`

**Metot adı:** `deleteUser`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `any` |

**Yanıt tipi:**

```
null | {
  id: undefined | string;
  name: string;
  surname: string;
  gender: string;
  pronounce: string;
  webSites: string[];
  country: string;
  state: string;
  city: string;
  district: string;
  localeCode: string;
  username: string;

}
```

---

## ResetPasswordController

### `POST` `api/reset-password`

**Metot adı:** `initPwReset`

**Request body:**

```
{
  username: string;

}
```

_Kaynak: `apps/users/src/web/password-reset.controller.ts`_

**Yanıt tipi:**

```
void
```

---

### `POST` `api/reset-password/:id`

**Metot adı:** `pwResetResolve`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `any` |

**Request body:**

```
{
  newPassword: string;

}
```

_Kaynak: `apps/users/src/web/password-reset.controller.ts`_

**Yanıt tipi:**

```
void
```

---

### `GET` `api/reset-password/:id`

**Metot adı:** `hasPasswrodResetRequest`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `any` |

**Yanıt tipi:**

```
boolean
```

---

## EntityOwnershipController

_Metot bulunamadı._

## UserMicroserviceController

_Metot bulunamadı._

## UserRegisterController

### `POST` `api/user-registration/init`

**Metot adı:** `startRegistration`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `registrationId` | `string \| undefined` |

**Yanıt tipi:**

```
{
  registerId: string;
  username: string;
  password: string;
  primaryEmail: string;
  name: string;
  surname: string;
  localeCode: string;

}
```

_Kaynak: `libs/users-common/src/user-register.model.ts`_

---

### `POST` `api/user-registration`

**Metot adı:** `registerUser`

**Request body:**

```
{
  registerId: string;
  username: string;
  password: string;
  primaryEmail: string;
  name: string;
  surname: string;
  localeCode: string;

}
```

_Kaynak: `libs/users-common/src/user-register.model.ts`_

**Yanıt tipi:**

```
void
```

---

### `POST` `api/user-registration/activate/:key`

**Metot adı:** `activate`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `key` | `string` |

**Yanıt tipi:**

```
void
```

---

## EntityOwnershipGroupMicroserviceController

_Metot bulunamadı._

## EntityOwnershipGroupController

### `GET` `api/entity-ownership-group/:id`

**Metot adı:** `getOne`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Yanıt tipi:**

```
{
  id: undefined | string;
  name: string;
  description: string;
  initialUserId: undefined | string;
  initialUserEntityCapabilities: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/entity-ownership-group").EOGUserEntityCapabilityDTO[];

}
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

---

### `GET` `api/entity-ownership-group`

**Metot adı:** `findAll`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string \| undefined` |
| `name` | `string` |
| `description` | `string \| undefined` |
| `memberUserId` | `string \| undefined` |
| `admin` | `"true" \| "false" \| undefined` |
| `page` | `number` |
| `size` | `number` |
| `sortBy` | `string \| undefined` |
| `sortRotation` | `"desc" \| "asc" \| undefined` |

**Yanıt tipi:**

```
{
  id: string | undefined;
  name: string;
  description: string;
  initialUserId: string | undefined;
  initialUserEntityCapabilities: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/entity-ownership-group").EOGUserEntityCapabilityDTO[];

}[]
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

---

### `GET` `api/entity-ownership-group/_search`

**Metot adı:** `searchAll`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string \| undefined` |
| `name` | `string` |
| `description` | `string \| undefined` |
| `memberUserId` | `string \| undefined` |
| `admin` | `"true" \| "false" \| undefined` |
| `page` | `number` |
| `size` | `number` |
| `sortBy` | `string \| undefined` |
| `sortRotation` | `"desc" \| "asc" \| undefined` |

**Yanıt tipi:**

```
{
  content: EntityOwnershipGroupCommonDTO[];
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

### `POST` `api/entity-ownership-group`

**Metot adı:** `createEntityOwnershipGroup`

**Request body:**

```
{
  id: undefined | string;
  name: string;
  description: string;
  initialUserId: undefined | string;
  initialUserEntityCapabilities: {
    entityGroup: string;
    entityName: string;
    capability: string;

  }[];

}
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

**Yanıt tipi:**

```
{
  id: undefined | string;
  name: string;
  description: string;
  initialUserId: undefined | string;
  initialUserEntityCapabilities: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/entity-ownership-group").EOGUserEntityCapabilityDTO[];

}
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

---

### `PUT` `api/entity-ownership-group`

**Metot adı:** `editMeta`

**Request body:**

```
{
  id: string;
  name: string;
  description: undefined | string;

}
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

**Yanıt tipi:**

```
{
  id: undefined | string;
  name: string;
  description: string;
  initialUserId: undefined | string;
  initialUserEntityCapabilities: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/entity-ownership-group").EOGUserEntityCapabilityDTO[];

}
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

---

### `DELETE` `api/entity-ownership-group/:id`

**Metot adı:** `deleteEntityOwnershipGroup`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Yanıt tipi:**

```
void
```

---

## EntityOwnershipGroupMemberController

### `GET` `api/entity-ownership-group/:id/users`

**Metot adı:** `fetchUsersInGroup`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Yanıt tipi:**

```
{
  userId: string;
  userFullName: string | undefined;
  entityCapabilities: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/entity-ownership-group").EOGUserEntityCapabilityDTO[];
  groupCapability: GroupCapability;

}[]
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

---

### `GET` `api/entity-ownership-group/:id/invitation`

**Metot adı:** `fetchUserCapabilityInvitations`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Yanıt tipi:**

```
{
  eogName: string;
  eogDescription: string;
  eogId: string;
  invitedByUserId: string;
  invitedByUserName: string;
  userName: string;
  userId: string;
  invitationId: string;
  entityCapabilities: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/entity-ownership-group").EOGUserEntityCapabilityDTO[];
  groupCapability: GroupCapability;

}[]
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

---

### `PUT` `api/entity-ownership-group/:id/capability`

**Metot adı:** `updateUserCapability`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Request body:**

```
{
  userId: string;
  userFullName: undefined | string;
  entityCapabilities: {
    entityGroup: string;
    entityName: string;
    capability: string;

  }[];
  groupCapability: "OWNER" | "VIEWER" | "EDITOR" | "META_EDIT" | "ADJUST_MEMBERS" | "ONLY_EDIT_MEMBER_CAPABILITIES";

}
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

**Yanıt tipi:**

```
{
  id: undefined | string;
  name: string;
  description: string;
  initialUserId: undefined | string;
  initialUserEntityCapabilities: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/entity-ownership-group").EOGUserEntityCapabilityDTO[];

}
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

---

### `DELETE` `api/entity-ownership-group/:id/capability/:userId`

**Metot adı:** `removeUserFromEntityOwnership`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |
| `userId` | `string` |

**Yanıt tipi:**

```
void
```

---

### `DELETE` `api/entity-ownership-group/:id/invitation/:invitationId`

**Metot adı:** `removeUserFromEntityOwnershipInvitation`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |
| `invitationId` | `string` |

**Yanıt tipi:**

```
void
```

---

### `POST` `api/entity-ownership-group/:id/invitation`

**Metot adı:** `addUserToEntityOwnership`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `id` | `string` |

**Request body:**

```
{
  userLogin: string;
  entityCapabilities: {
    entityGroup: string;
    entityName: string;
    capability: string;

  }[];
  groupCapability: "OWNER" | "VIEWER" | "EDITOR" | "META_EDIT" | "ADJUST_MEMBERS" | "ONLY_EDIT_MEMBER_CAPABILITIES";

}
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

**Yanıt tipi:**

```
void
```

---

### `DELETE` `api/entity-ownership-group/invitation/:inviteId`

**Metot adı:** `refuseInvitationCurrentUser`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `inviteId` | `string` |

**Yanıt tipi:**

```
void
```

---

### `POST` `api/entity-ownership-group/invitation/:inviteId`

**Metot adı:** `acceptDirectlyToEntityOwnership`

**Path parametreleri:**

| İsim | Tip |
|------|-----|
| `inviteId` | `string` |

**Yanıt tipi:**

```
void
```

---

### `GET` `api/entity-ownership-group/invitation/_currentuser`

**Metot adı:** `fetchMyInvitations`

**Yanıt tipi:**

```
{
  eogName: string;
  eogDescription: string;
  eogId: string;
  invitedByUserId: string;
  invitedByUserName: string;
  userName: string;
  userId: string;
  invitationId: string;
  entityCapabilities: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/users-common/src/entity-ownership-group").EOGUserEntityCapabilityDTO[];
  groupCapability: GroupCapability;

}[]
```

_Kaynak: `libs/users-common/src/entity-ownership-group.ts`_

---
