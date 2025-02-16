import * as FileSystem from 'fs/promises';
import * as path from 'path';
import { strColor, COLORS } from './colors';

export class DirectoryUtil {
    /**
     * List all files in the folder recursively
     * @param folderPath
     * @returns the list that contains full file paths
     */
    static async listAllFiles(folderPath: string) {
        const allFileList: string[] = [];
        await this.circulateFilesRecursive(folderPath, (a) => {
            allFileList.push(a);
        });
        return allFileList;
    }

    /**
     * Circulates files in the folder recursively
     * @param folderPath
     * @method fileAction if encounters a file, that will called with file full path
     */
    static async circulateFilesRecursive(
        folderPath: string,
        fileAction: (fileName: string) => PromiseLike<void> | void,
    ) {
        const onQueue: string[] = [];

        let current: string | null | undefined = folderPath;
        while (current) {
            try {
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
            } catch (error) {
                console.warn(
                    strColor(
                        COLORS.BgYellow,
                        'An error occured while reading file: ' +
                            current +
                            '\nSo we skip this',
                    ),
                );
            }

            current = onQueue.pop();
        }
    }
}
