import * as FileSystem from 'fs/promises';
import * as path from 'path';

export class DirectoryUtil {
    /**
     * List all files in the folder recursively
     * @param folderPath
     * @returns the list that contains full file paths
     */
    static async listAllFiles(folderPath: string) {
        const allFileList: string[] = [];
        await this.operate(folderPath, (a) => {
            allFileList.push(a);
        });
        return allFileList;
    }

    /**
     * Circulates files in the folder recursively
     * @param folderPath
     * @method fileAction if encounters a file, that will called with file full path
     */
    static async operate(
        folderPath: string,
        fileAction: (fileName: string) => PromiseLike<void> | void,
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
                    await fileAction(fullPath);
                }
            }
            current = onQueue.pop();
        }
    }
}
