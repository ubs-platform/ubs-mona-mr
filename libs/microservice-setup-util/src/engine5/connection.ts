// import net = require("net"); // import 'net' module
import * as net from "net";
import { Payload } from "./payload";
import { encode, decode } from "@msgpack/msgpack";
import { DynamicQueue } from "@ubs-platform/dynamic-queue";
import { json } from "stream/consumers";

export class Engine5Connection {
  tcpClient = new net.Socket();
  connected = false;
  listeningSubjectCallbacks: { [key: string]: ((a: any) => any)[] } = {};
  ongoingRequestsToComplete: { [key: string]: (a: any) => void } = {};


  // onGoingRequests: Map<string, ((a: any) => any)[]> = new Map();

  readonly queue = new DynamicQueue();

  constructor(
    private host: string,
    private port: string | number,
    private instanceId?: string
  ) { }

  async writePayload(p: Payload): Promise<Engine5Connection> {
    return new Promise((ok, fail) => {
      this.queue.push(() => {
        // const encoded = new Uint8Array();
        try {
          const buff = Buffer.from([...encode(p), 4]);
          debugger;

          this.tcpClient.write(buff, (e) => {

            if (e) fail(e);
            else ok(this);
          });
        } catch (error) {
          console.error(error);
        }
      })
    });
  }

  async listen(subject: string, cb: (a: any) => any) {
    await this.writePayload({
      Command: "LISTEN",
      Subject: subject,
      MessageId: this.messageIdGenerate()
    });
    const ls = this.listeningSubjectCallbacks[subject] || [];
    ls.push(cb);
    this.listeningSubjectCallbacks[subject] = ls;
  }

  private messageIdGenerate(): string | undefined {
    return Date.now() + "_" + (Math.random() * 100000).toFixed();
  }

  async sendRequest(subject: string, data: any) {
    const messageId = Date.now() + "_" + (Math.random() * 100000).toFixed();
    await this.writePayload({
      Command: "REQUEST",
      Subject: subject,
      Content: JSON.stringify(data),
      MessageId: messageId
    });
    return new Promise((ok, fail) => {
      this.ongoingRequestsToComplete[messageId] = (response: Payload) => {
        const jsonObj = JSON.parse(response.Content!) as any
        ok(jsonObj)
      }
    })

  }

  async sendEvent(subject: string, data: any) {
    console.info("SEND EVENT", subject);
    await this.writePayload({
      Command: "EVENT",
      Subject: subject,
      Content: JSON.stringify(data),
    });
  }
  // async sendEventStr(subject: string, data: string) {
  //   await this.writePayload({
  //     Command: "LISTEN",
  //     Subject: subject,
  //     Content: data,
  //   });
  // }

  async init() {
    debugger

    if (this.connected) {
      return this;
    }
    return new Promise<Engine5Connection>((ok, fail) => {
      console.info("Connecting to server");
      const client = this.tcpClient;
      let currentBuff: number[] = [];
      client.connect(parseInt(this.port as any), this.host, () => {
        //   client.write("I am Chappie");
        this.writePayload({
          Command: "CONNECT",
          InstanceId: this.instanceId || "",
        });
      });
      client.on("data", (data: Buffer) => {
        // console.info("Gelen data", data);
        this.queue.push(async () => {
          let newBuffData = [...currentBuff, ...data];
          let splitByteIndex = newBuffData.indexOf(4);
          while (splitByteIndex > -1) {
            const popped = newBuffData.slice(0, splitByteIndex);
            this.processIncomingData(popped, ok);

            newBuffData = newBuffData.slice(splitByteIndex + 1);
            splitByteIndex = newBuffData.indexOf(4);
          }
          currentBuff = newBuffData;
        })
      });

      client.on("error", (err) => {

        console.error(`Error occured ${err}`);
      });

      client.on("close", function () {

        this.connected = false;
        console.log("Connection closed");
      });
    });
  }

  private async processIncomingData(
    data: any,
    promiseResolveFunc?: (
      value: Engine5Connection | PromiseLike<Engine5Connection>
    ) => void
  ) {
    const decoded: Payload = decode(data) as any as Payload;
    if (decoded.Command == "CONNECT_SUCCESS") {
      this.connected = true;
      this.instanceId = decoded.InstanceId;
      promiseResolveFunc?.(this);
      console.info("Connected Successfully");
    } else if (decoded.Command == "EVENT") {
      console.info("Event recieved", decoded.Subject);
      this.processReceivedEvent(decoded);
    } else if (decoded.Command == "REQUEST") {
      console.info("Request recieved: ", decoded.Subject);
      try {
        const ac = await this.listeningSubjectCallbacks[decoded.Subject!][0](JSON.parse(decoded.Content!))
        // this.ongoingRequestsToComplete[decoded.MessageId!](ac) 
        await this.writePayload({
          Command: "RESPONSE",
          Content: JSON.stringify(ac),
          MessageId: this.messageIdGenerate(),
          Subject: decoded.Subject,
          ResponseOfMessageId: decoded.MessageId
        })
      } catch (ex) {
        console.error(ex)
      }

    } else if (decoded.Command == "RESPONSE") {
      this.ongoingRequestsToComplete[decoded.ResponseOfMessageId!](decoded)
    }
  }

  private processReceivedEvent(decoded: Payload) {
    const cbs = this.listeningSubjectCallbacks[decoded.Subject!] || [];
    for (let callbackIndex = 0; callbackIndex < cbs.length; callbackIndex++) {
      const callback = cbs[callbackIndex];
      callback(decoded.Content);
    }
  }

  async close() { }
}
