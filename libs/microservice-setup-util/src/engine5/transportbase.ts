// import { from, Observable } from "rxjs";
// import { E5NestClient } from "./client";
// import { Engine5Connection } from "./connection";
// import { E5NestServer } from "./server";

// export class E5TransportBase {

//     /**
//      *
//      */
//     constructor(public connection: Engine5Connection) {

//     }

//     asClientClass() {
//         const con = this.connection;
//         class x {
//             /**
//              *
//              */
//             subscribeToResponseOf(..._) {
//                 // noop
//             }

//             connect(): Promise<any> {
//                 return con.init();
//             }
//             unwrap() {
//                 return con as any
//             }

//             emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
//                 return from(con.sendEvent(pattern, data)) as Observable<TResult>
//             }


//             send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
                
//                 return new Observable<TResult>(a => {
//                     con.sendRequest(pattern, data).then(result => {
//                         a.next(result as TResult);
//                         a.complete();
//                     })
//                 })
//             }


//             async close() {
//                 // con.close()
//             }
//         }
//         return x as any
//     }

//     asServer() {
//         return new E5NestServer(this.connection)

//     }
// }