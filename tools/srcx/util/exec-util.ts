import { exec } from 'child_process';

export class ExecUtil {
    static exec(command) {
        return new Promise(function (resolve, reject) {
            exec(command, (error, stdout, stderr) => {
                console.error(stderr);
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}
