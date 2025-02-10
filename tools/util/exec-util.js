"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecUtil = void 0;
const child_process_1 = require("child_process");
class ExecUtil {
    static exec(command) {
        return new Promise(function (resolve, reject) {
            (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                console.error(stderr);
                if (error) {
                    reject(error);
                }
                else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}
exports.ExecUtil = ExecUtil;
