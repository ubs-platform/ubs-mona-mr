export const CtConnect = "CONNECT";
export const CtConnectSuccess = "CONNECT_SUCCESS";
export const CtReceived = "RECEIVED";
export const CtEvent = "EVENT";
export const CtRequest = "REQUEST";
export const CtResponse = "RESPONSE";
export const CtListen = "LISTEN";
export const CtClose = "CLOSE";
export const CtConnectError = "CONNECT_ERROR";


export type CommandType =
  | typeof CtConnect
  | typeof CtConnectSuccess
  | typeof CtReceived
  | typeof CtEvent
  | typeof CtRequest
  | typeof CtResponse
  | typeof CtListen
  | typeof CtClose
  | typeof CtConnectError;

export interface Payload {
  Command: CommandType;
  Content?: string;
  Subject?: string;
  InstanceId?: string;
  MessageId?: string;
  ResponseOfMessageId?: string;
  InstanceGroup?: string;
  AuthKey?: string;
}
