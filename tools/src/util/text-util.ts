import { DirectoryUtil } from './directory-util';
import * as FileSystem from 'fs/promises';

export class TextUtil {
    /**
     * Replaces a text with a another text recursively
     * @param path directory
     * @param finding
     * @param replacedWith
     */
    static async replaceText(
        path: string,
        finding: string,
        replacedWith: string,
    ) {
        await DirectoryUtil.operate(path, async (filePath) => {
            let content = await FileSystem.readFile(filePath, 'utf8');
            content = content.replaceAll(finding, replacedWith);
            await FileSystem.writeFile(filePath, content, 'utf8');
        });
    }
}

// DirectoryUtil.listAllFiles(
//     '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr/dist',
// ).then(console.info);

// TextUtil.replaceText(
//     '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr/dist',
//     `@mona/microservice-setup-util`,
//     '@ubs-platform/nest-microservice-setup-util',
// ).then(console.info);
