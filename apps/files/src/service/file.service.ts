import { Injectable, Logger } from '@nestjs/common';
import { FileDoc, FileModel } from '../model/file.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FileMeta } from '../dto/file-meta';
import { FileRequest } from '../dto/file-request';
import * as sharp from 'sharp';
import { FileVolatileTag } from '../dto/file-volatile-tag';
import { Cron } from '@nestjs/schedule';
import { DynamicQueue } from '@ubs-platform/dynamic-queue';
import { Optional } from '@ubs-platform/crud-base-common/utils';

// Constants
const IMAGE_MIME_TYPES_NONWEBP = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/apng',
    'image/avif',
]);

const DEFAULT_VOLATILITY_DURATION = 3600000; // 1 hour in milliseconds
const IMAGE_WIDTH_STEP = 50;
const MIN_IMAGE_WIDTH = 100;

@Injectable()
export class FileService {
    private readonly logger = new Logger(FileService.name);
    private readonly dynamicQueue = new DynamicQueue();

    constructor(
        @InjectModel(FileModel.name) private fileModel: Model<FileDoc>,
    ) {}

    async removeByName(name: string): Promise<void> {
        try {
            await this.fileModel.findOneAndDelete({ name });
        } catch (error) {
            this.logger.error(`Failed to remove file: ${name}`, error);
        }
    }

    async updateVolatilities(volatilities: FileVolatileTag[]): Promise<void> {
        const updatePromises = volatilities.map(async (volatility) => {
            try {
                const existFile = await this.findByNamePure(
                    volatility.category,
                    volatility.name,
                );
                if (!existFile) {
                    this.logger.warn(
                        `File not found: ${volatility.category}/${volatility.name}`,
                    );
                    return;
                }
                this.setVolatility(
                    existFile,
                    volatility.volatile,
                    volatility.durationMiliseconds,
                );
                await existFile.save();
            } catch (error) {
                this.logger.error(
                    `Failed to update volatility for ${volatility.name}`,
                    error,
                );
            }
        });
        await Promise.all(updatePromises);
    }

    async findByName(
        category: string,
        name: string,
        widthForImage?: string | number | null,
    ): Promise<FileMeta | null> {
        const file = await this.findByNamePure(category, name);
        if (!file) {
            return null;
        }

        const fileBin = await this.determineBin(file, widthForImage);

        // Update lastFetch asynchronously
        this.dynamicQueue
            .push(async () => {
                try {
                    file.lastFetch = new Date();
                    await file.save();
                } catch (error) {
                    this.logger.error(
                        `Failed to update lastFetch for ${category}/${name}`,
                        error,
                    );
                }
            })
            .output.subscribe({
                error: (err) => this.logger.error('Queue error:', err),
            });

        return {
            id: file._id,
            file: fileBin,
            mimetype: file.mimeType,
            userId: file.userId,
        };
    }

    private async determineBin(
        file: FileDoc,
        widthForImage?: Optional<string | number>,
    ): Promise<Buffer> {
        // Return original file if not an image or no width specified
        if (!this.isImage(file.mimeType)) {
            return file.file;
        }

        const widthForImageInt = this.parseImageWidth(widthForImage);
        if (widthForImageInt <= 0) {
            return file.file;
        }

        try {
            // Initialize scaledImages if null
            if (!file.scaledImages) {
                file.scaledImages = [];
            }

            const roundedWidth = this.roundImageWidth(widthForImageInt);
            const cachedImage = file.scaledImages.find(
                (img) => img.width === roundedWidth,
            );

            if (cachedImage) {
                return cachedImage.useSame
                    ? file.file
                    : Buffer.from(cachedImage.file!.buffer);
            }

            return await this.createAndCacheScaledImage(file, roundedWidth);
        } catch (error) {
            this.logger.error('Error determining image buffer:', error);
            return file.file;
        }
    }

    private async createAndCacheScaledImage(
        file: FileDoc,
        targetWidth: number,
    ): Promise<Buffer> {
        const imageSharp = sharp(file.file);
        const metadata = await imageSharp.metadata();

        if (!metadata.width || metadata.width <= targetWidth) {
            // Image is smaller than target or no width info
            file.scaledImages!.push({
                width: targetWidth,
                file: null,
                useSame: true,
            });
            return file.file;
        }

        // Resize image to WebP format
        const resizedBuffer = await imageSharp
            .resize({
                width: targetWidth,
                withoutEnlargement: true,
                fit: 'contain',
            })
            .webp()
            .toBuffer();

        file.scaledImages!.push({
            width: targetWidth,
            file: resizedBuffer,
            useSame: false,
        });

        // Keep sorted for consistent ordering
        file.scaledImages!.sort((a, b) => a.width - b.width);

        return resizedBuffer;
    }

    private parseImageWidth(width?: Optional<string | number>): number {
        if (!width) return 0;
        const parsed = parseInt(String(width), 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    private roundImageWidth(width: number): number {
        return Math.max(
            Math.floor(width / IMAGE_WIDTH_STEP) * IMAGE_WIDTH_STEP,
            MIN_IMAGE_WIDTH,
        );
    }

    private findByNamePure(category: string, name: string) {
        this.logger.debug(`Finding file: ${category}/${name}`);
        return this.fileModel.findOne({ name, category });
    }

    async uploadFile(
        ft: FileRequest,
        mode: 'start' | 'continue',
    ): Promise<number> {
        try {
            const optimizedRequest = await this.applyUploadOptimisations(ft);
            const existingFile = await this.findByNamePure(
                optimizedRequest.category,
                optimizedRequest.name,
            );
            const fileDoc = existingFile || new this.fileModel();

            // Combine buffers more efficiently using Buffer.concat
            const fileBuffer =
                mode === 'start'
                    ? optimizedRequest.fileBytesBuff
                    : Buffer.concat([
                          fileDoc.file || Buffer.alloc(0),
                          optimizedRequest.fileBytesBuff,
                      ]);

            // Update document
            fileDoc.file = fileBuffer;
            fileDoc.mimeType = optimizedRequest.mimeType;
            fileDoc.length = optimizedRequest.size;
            fileDoc.name = optimizedRequest.name;
            fileDoc.category = optimizedRequest.category;
            fileDoc.scaledImages = [];

            this.setVolatility(
                fileDoc,
                optimizedRequest.volatile,
                optimizedRequest.durationMiliseconds,
            );

            await fileDoc.save();
            const remaining = optimizedRequest.size - fileBuffer.length;
            return remaining;
        } catch (error) {
            this.logger.error(`Failed to upload file: ${ft.name}`, error);
            return 0;
        }
    }

    private setVolatility(
        file: any,
        volatile?: boolean,
        durationMilliseconds?: number,
    ): void {
        file.volatile = volatile ?? true;
        file.expireAt = new Date(
            Date.now() +
                (durationMilliseconds ?? DEFAULT_VOLATILITY_DURATION),
        );
    }

    async applyUploadOptimisations(
        fileRequest: FileRequest,
    ): Promise<FileRequest> {
        if (this.isImageNonWebP(fileRequest.mimeType)) {
            try {
                const webpBuffer = await sharp(fileRequest.fileBytesBuff)
                    .webp()
                    .toBuffer();
                fileRequest.fileBytesBuff = webpBuffer;
                fileRequest.mimeType = 'image/webp';
            } catch (error) {
                this.logger.warn(
                    `Failed to convert to WebP: ${fileRequest.name}`,
                    error,
                );
            }
        }
        return fileRequest;
    }

    private isImageNonWebP(mimeType: string): boolean {
        return IMAGE_MIME_TYPES_NONWEBP.has(mimeType);
    }

    private isImage(mimeType: string): boolean {
        return (
            IMAGE_MIME_TYPES_NONWEBP.has(mimeType) ||
            mimeType === 'image/webp'
        );
    }

    @Cron('0 20 4 * * *')
    async handleCron(): Promise<void> {
        try {
            this.logger.log('Cleaning up expired volatile files...');
            const result = await this.fileModel.deleteMany({
                volatile: true,
                expireAt: { $lte: new Date() },
            });
            this.logger.log(
                `Deleted ${result.deletedCount} expired volatile files`,
            );
        } catch (error) {
            this.logger.error('Error cleaning up expired files:', error);
        }
    }
}
