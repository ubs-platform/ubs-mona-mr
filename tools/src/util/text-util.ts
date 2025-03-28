import { DirectoryUtil } from './directory-util';
import * as FileSystem from 'fs/promises';

export type ReplaceInstruction = string | null | undefined;
export type StringByFilePathCallbk = (filePath: string) => ReplaceInstruction;

export interface TextFoundItem {
    path: string;
    found: RegExpExecArray;
}

export interface ReplaceTextRecipe {
    finding: string;
    replaceWith: ReplaceInstruction | StringByFilePathCallbk;
}

export class TextUtil {
    /**
     * Replaces a text with a another text recursively
     * @param path
     * @param replaceTextRecipes please see `ReplaceTextRecipe`
     */
    static async replaceText(
        path: string,
        replaceTextRecipes: ReplaceTextRecipe[],
    ) {
        await DirectoryUtil.circulateFilesRecursive(path, async (filePath) => {
            let content = await FileSystem.readFile(filePath, 'utf8');
            for (let index = 0; index < replaceTextRecipes.length; index++) {
                const replaceRecipe = replaceTextRecipes[index];
                let replaceWith: ReplaceInstruction = '';
                if (typeof replaceRecipe.replaceWith == 'function') {
                    replaceWith = await replaceRecipe.replaceWith(filePath);
                } else {
                    replaceWith = replaceRecipe.replaceWith;
                }
                if (replaceWith != null && replaceWith != undefined) {
                    content = content.replaceAll(
                        replaceRecipe.finding,
                        replaceWith,
                    );
                }
            }
            await FileSystem.writeFile(filePath, content, 'utf8');
        });
    }

    static async findByRegex(path: string, findings: RegExp[]) {
        let founded: Map<RegExp, TextFoundItem[]> = new Map();
        await DirectoryUtil.circulateFilesRecursive(path, async (filePath) => {
            let content = await FileSystem.readFile(filePath, 'utf8');

            for (
                let findingIndex = 0;
                findingIndex < findings.length;
                findingIndex++
            ) {
                let items: TextFoundItem[] = [];

                const finding = findings[findingIndex];
                let a = finding.exec(content);
                while (a) {
                    items.push({
                        found: a,
                        path: filePath,
                    });
                    a = finding.exec(content);
                }
                let arr = founded.get(finding) || [];
                arr.push(...items);
                founded.set(finding, arr);
            }
        });

        return founded;
    }
}

// DirectoryUtil.listAllFiles(
//     '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr/dist',
// ).then(console.info);

// TextUtil.replaceText(
//     '/home/huseyin/Belgeler/dev/tk/lotus-ubs/ubs-mona-mr/dist',
//     `@ubs-platform/microservice-setup-util`,
//     '@ubs-platform/microservice-setup-util',
// ).then(console.info);
