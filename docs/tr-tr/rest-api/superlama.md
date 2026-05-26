# superlama REST API

## RealtimeChatController

### `POST` `api/realtime-chat`

**Metot adı:** `insertUserMessage`

**Request body:**

```
{
  newSession: boolean;
  sessionId: undefined | string;
  message: string;
  selectedLlm: string;

}
```

_Kaynak: `libs/superlama-common/src/user-sending-message.dto.ts`_

**Yanıt tipi:**

```
{
  _id: string;
  createdAt: string;
  updatedAt: string;
  textContent: string;
  requestedLlmModel: string;
  thoughtTextContent: string;
  systemTextContent: string;
  senderType: "USER" | "ASSISTANT" | "SYSTEM";
  textAssistantStage: "" | "ANSWER" | "THINKING" | "DONE";
  senderId: string;
  sessionId: string;
  moderationNoteWarning: string;
  assistantStartedAt: string;
  assistantFinishedAt: string;
  tokensPerSecond: number;

}
```

_Kaynak: `libs/superlama-common/src/chat-message.dto.ts`_

---

### `GET` `api/realtime-chat`

**Metot adı:** `findMessagesBySessionIdPaged`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `sessionId` | `string` |
| `beforeDate` | `string \| undefined` |
| `lastChatMessageId` | `string \| undefined` |

**Yanıt tipi:**

```
{
  _id: string;
  createdAt: string;
  updatedAt: string;
  textContent: string;
  requestedLlmModel: string;
  thoughtTextContent: string;
  systemTextContent: string;
  senderType: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/superlama-common/src/text-sender-type.dto").ChatMessageSenderType;
  textAssistantStage: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/superlama-common/src/text-assistant-stage").TextAssitantStage;
  senderId: string;
  sessionId: string;
  moderationNoteWarning: string;
  assistantStartedAt: string;
  assistantFinishedAt: string;
  tokensPerSecond: number;

}[]
```

_Kaynak: `libs/superlama-common/src/chat-message.dto.ts`_

---

## SessionController

### `GET` `api/session/current-user`

**Metot adı:** `searchUserSessions`

**Query parametreleri:**

| İsim | Tip |
|------|-----|
| `size` | `number` |
| `page` | `number` |

**Yanıt tipi:**

```
{
  content: import("/home/huseyin/dev/tk-ubs/users-mona-mr/libs/superlama-common/src/chat-session.dto").ChatSessionDTO[];
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

## LlmModelsController

### `GET` `api/llm-models`

**Metot adı:** `findMessagesBySessionIdPaged`

**Yanıt tipi:**

```
{
  name: string;
  type: "REASONABLE" | "HERBOKOLOG" | "VISSION_SUPPORT";

}[]
```

_Kaynak: `libs/superlama-common/src/llm-model.dto.ts`_

---
