import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FileDoc, FileModel } from '@ubs-platform/files-entity-mongo';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FileMeta } from '../dto/file-meta';
import { FileRequest } from '../dto/file-request';
import * as sharp from 'sharp';
import { FileVolatileTag } from '../dto/file-volatile-tag';
import { CacheManagerService } from '@ubs-platform/cache-manager';
import { Cron } from '@nestjs/schedule';
import { DynamicQueue } from '@ubs-platform/dynamic-queue';
import { Optional } from '@ubs-platform/crud-base-common/utils';
import { createHash } from 'crypto';

// Constants
const IMAGE_MIME_TYPES_NONWEBP = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/apng',
    'image/avif',
]);

const DEFAULT_VOLATILITY_DURATION = 3600000; // 1 hour in milliseconds
const IMAGE_WIDTH_STEP = 75; // Round widths to nearest 75px for caching
const MIN_IMAGE_WIDTH = 100;

const PROXY_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const PROXY_FETCH_TIMEOUT_MS = 10_000;
const PROXY_MAX_DIMENSION = 2048;

const PRIVATE_IP_PATTERNS = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^169\.254\./,
    /^\[?::1\]?$/,
    /^\[?fe80:/i,
    /^\[?fd[0-9a-f]{2}:/i,
];

@Injectable()
export class FileService {

    private readonly logger = new Logger(FileService.name);
    private readonly dynamicQueue = new DynamicQueue();
    private readonly pendingLastFetchSaves = new Set<string>();

    private readonly cacheLiveTime = 5 * 60 * 1000;

    constructor(
        @InjectModel(FileModel.name) private fileModel: Model<FileDoc>,
        private cacheManager: CacheManagerService,
    ) { }

    async removeByName(name: string): Promise<void> {
        try {
            await this.fileModel.findOneAndDelete({ name });
            this.invalidateFileCacheByName(name);
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
        const parsedWidth = this.parseImageWidth(widthForImage);
        const normalizedWidth = parsedWidth > 0 ? this.roundImageWidth(parsedWidth) : 0;
        const cacheKey = `file:${category}:${name}:${normalizedWidth}`;

        return this.cacheManager.getOrCallAsync<FileMeta | null>(
            cacheKey,
            async () => {
                const file = await this.findByNamePure(category, name);
                if (!file) return null;

                const fileBin = await this.determineBin(file, widthForImage);

                const fetchKey = `${category}:${name}`;
                if (!this.pendingLastFetchSaves.has(fetchKey)) {
                    this.pendingLastFetchSaves.add(fetchKey);
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
                            } finally {
                                this.pendingLastFetchSaves.delete(fetchKey);
                            }
                        })
                        .output.subscribe({
                            error: (err) => this.logger.error('Queue error:', err),
                        });
                }

                return {
                    id: file._id,
                    file: fileBin,
                    mimetype: file.mimeType,
                    userId: file.userId,
                    needAuthorizationAtView: file.needAuthorizationAtView?.valueOf(),
                };
            },
            { livetime: this.cacheLiveTime, livetimeExtending: 'ON_GET' },
        );
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

    private invalidateFileCache(category: string, name: string): void {
        const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        this.cacheManager.invalidateRegex(new RegExp(`^file:${esc(category)}:${esc(name)}:`));
    }

    private invalidateFileCacheByName(name: string): void {
        const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        this.cacheManager.invalidateRegex(new RegExp(`^file:[^:]+:${esc(name)}:`));
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
            fileDoc.needAuthorizationAtView = optimizedRequest.needAuthorizationAtView;
            this.setVolatility(
                fileDoc,
                optimizedRequest.volatile,
                optimizedRequest.durationMiliseconds,
            );

            await fileDoc.save();
            this.invalidateFileCache(optimizedRequest.category, optimizedRequest.name);
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
        needAuthorizationAtView?: boolean,
    ): void {
        file.volatile = volatile ?? true;
        file.needAuthorizationAtView = needAuthorizationAtView ?? false;
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

    // ─── External Image Proxy ──────────────────────────────────────────────────

    /**
     * Downloads an external image URL, optimises it and stores it locally.
     * GIFs are stored as-is (must be ≤ 5 MB).
     * All other image types are converted to WebP and resized to max 2 K before
     * the 5 MB limit is checked.
     * The file name is the first 40 hex chars of SHA-256(url), which provides
     * server-side deduplication: the same URL is never downloaded twice.
     */
    async proxyExternalImage(
        url: string,
        category = 'GENERAL',
    ): Promise<{ category: string; name: string }> {
        if (!this.isAllowedProxyUrl(url)) {
            throw new BadRequestException('invalid-proxy-url');
        }

        const name = createHash('sha256').update(url).digest('hex').slice(0, 40);

        const existing = await this.findByNamePure(category, name);
        if (existing) {
            return { category, name };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROXY_FETCH_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(url, { signal: controller.signal });
        } catch {
            throw new BadRequestException('proxy-fetch-failed');
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            throw new BadRequestException('proxy-fetch-failed');
        }

        const contentType = response.headers.get('content-type') ?? '';
        const mimeType = contentType.split(';')[0].trim().toLowerCase();

        if (!mimeType.startsWith('image/')) {
            throw new BadRequestException('not-an-image');
        }

        const arrayBuffer = await response.arrayBuffer();
        const rawBuffer = Buffer.from(arrayBuffer);

        let finalBuffer: Buffer;
        let finalMime: string;

        if (mimeType === 'image/gif') {
            if (rawBuffer.length > PROXY_MAX_BYTES) {
                throw new BadRequestException('image-too-large');
            }
            finalBuffer = rawBuffer;
            finalMime = 'image/gif';
        } else {
            const webpBuffer = await sharp(rawBuffer)
                .resize({
                    width: PROXY_MAX_DIMENSION,
                    height: PROXY_MAX_DIMENSION,
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .webp()
                .toBuffer();

            if (webpBuffer.length > PROXY_MAX_BYTES) {
                throw new BadRequestException('image-too-large');
            }
            finalBuffer = webpBuffer;
            finalMime = 'image/webp';
        }

        await this.uploadFile(
            {
                category,
                name,
                fileBytesBuff: finalBuffer,
                mimeType: finalMime,
                size: finalBuffer.length,
                volatile: false,
                durationMiliseconds: 0,
                needAuthorizationAtView: false,
            },
            'start',
        );

        return { category, name };
    }

    private isAllowedProxyUrl(url: string): boolean {
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            return false;
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return false;
        }

        const host = parsed.hostname;
        return !PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(host));
    }

    // ──────────────────────────────────────────────────────────────────────────

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
