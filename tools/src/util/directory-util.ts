import * as FileSystem from 'fs/promises';
import * as path from 'path';

export class DirectoryUtil {
    static async listAllFiles(folderPath: string) {
        const allFileList: string[] = [];
        await this.operate(folderPath, (a) => {
            allFileList.push(a);
        });
        return allFileList;
    }

    static async operate(
        folderPath: string,
        method: (fileName: string) => PromiseLike<void> | void,
    ) {
        const onQueue: string[] = [];

        let current: string | null | undefined = folderPath;
        while (current) {
            const fileList = await FileSystem.readdir(current);
            for (let index = 0; index < fileList.length; index++) {
                const fileName = fileList[index];
                const fullPath = path.join(current, fileName);
                const fileInfo = await FileSystem.stat(fullPath);
                if (fileInfo.isDirectory()) {
                    onQueue.push(fullPath);
                } else if (fileInfo.isFile()) {
                    await method(fullPath);
                }
            }
            current = onQueue.pop();
        }
    }
}
