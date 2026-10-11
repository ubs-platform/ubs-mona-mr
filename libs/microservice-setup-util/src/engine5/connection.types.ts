import * as tls from 'node:tls';
import { Payload } from './payload';

export type ConnectionStatus = 'CONNECTING' | 'CLOSED' | 'CONNECTED';
export type CallbackFunction = (data: any) => any;
export type RequestCallback = (response: Payload) => void;

export type TLSClientOptions = Pick<
    tls.ConnectionOptions,
    'ca' | 'cert' | 'key' | 'servername' | 'rejectUnauthorized'
>;

export interface Engine5ConnectionOptions {
    host: string;
    port: string | number;
    instanceGroup?: string;
    instanceId?: string;
    tlsEnabled?: boolean;
    tlsOptions?: TLSClientOptions;
    authKey?: string;
}
