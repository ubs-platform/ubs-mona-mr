import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    CommentFilterPatternAddDTO,
    CommentFilterPatternDTO,
    CommentFilterPatternImportResultDTO,
} from '@ubs-platform/social-common';
import { CommentFilterPattern } from '@ubs-platform/social-entity-mongo';
import {
    CompiledPattern,
    FilterDecision,
    compilePattern,
    evaluatePatterns,
    NON_STORING_ACTIONS,
    validateImport,
    validatePatternSource,
} from '../filter/comment-filter.engine';

const CACHE_TTL_MS = 60_000;

/**
 * Pattern CRUD + cache'li değerlendirme.
 * Yorum metni bu serviste hiçbir yere yazılmaz ve loglanmaz.
 */
@Injectable()
export class CommentFilterService {
    private cache: { at: number; compiled: CompiledPattern[] } | null = null;

    constructor(
        @InjectModel(CommentFilterPattern.name)
        private patternModel: Model<CommentFilterPattern>,
    ) {}

    async evaluate(text: string, entityGroup?: string): Promise<FilterDecision> {
        return evaluatePatterns(await this.compiled(), text, entityGroup);
    }

    private async compiled(): Promise<CompiledPattern[]> {
        const now = Date.now();
        if (this.cache && now - this.cache.at < CACHE_TTL_MS) {
            return this.cache.compiled;
        }
        const docs = await this.patternModel.find({ enabled: true }).lean();
        const compiled: CompiledPattern[] = [];
        for (const d of docs) {
            try {
                compiled.push(compilePattern(d as any));
            } catch {
                // bozuk pattern tüm filtreyi düşürmesin
            }
        }
        this.cache = { at: now, compiled };
        return compiled;
    }

    private invalidate() {
        this.cache = null;
    }

    async list(): Promise<CommentFilterPatternDTO[]> {
        return (await this.patternModel.find().sort({ _id: 1 }).lean()).map(
            (a) => this.toDto(a),
        );
    }

    async create(dto: CommentFilterPatternAddDTO): Promise<CommentFilterPatternDTO> {
        this.validateOrThrow(dto);
        const doc = await new this.patternModel(this.toEntityFields(dto)).save();
        this.invalidate();
        return this.toDto(doc.toObject());
    }

    async update(id: string, dto: CommentFilterPatternAddDTO): Promise<CommentFilterPatternDTO> {
        this.validateOrThrow(dto);
        const doc = await this.patternModel.findByIdAndUpdate(
            id,
            this.toEntityFields(dto),
            { new: true },
        );
        if (!doc) throw new NotFoundException('filter-pattern', id);
        this.invalidate();
        return this.toDto(doc.toObject());
    }

    async delete(id: string) {
        await this.patternModel.findByIdAndDelete(id);
        this.invalidate();
    }

    private validateOrThrow(dto: CommentFilterPatternAddDTO) {
        const err = validatePatternSource(dto);
        if (err) throw new BadRequestException(err);
    }

    private toEntityFields(dto: CommentFilterPatternAddDTO) {
        return {
            pattern: dto.pattern.trim(),
            type: dto.type,
            flag: NON_STORING_ACTIONS.includes(dto.action)
                ? undefined
                : dto.flag?.trim() || undefined,
            action: dto.action,
            banDurationHours:
                dto.action === 'BAN_USER' ? dto.banDurationHours : undefined,
            entityGroup: dto.entityGroup?.trim() || undefined,
            obfuscationResistant: !!dto.obfuscationResistant,
            enabled: dto.enabled ?? true,
            note: dto.note || undefined,
        };
    }

    /**
     * Tüm pattern'leri dosyadakilerle değiştirir. Bir kayıt bile hatalıysa hiçbir şey yazılmaz.
     * Transaction olmadığı için: önce yeniler batch işaretiyle eklenir, başarılıysa eskiler silinir;
     * ekleme yarıda kalırsa sadece yeni batch geri alınır ve eski set korunur.
     */
    async importReplace(body: unknown): Promise<CommentFilterPatternImportResultDTO> {
        const { items, errors } = validateImport(body);
        if (errors.length) {
            throw new BadRequestException({ message: 'import-invalid', errors });
        }
        const importBatchId = new Types.ObjectId().toString();
        try {
            await this.patternModel.insertMany(
                items.map((a) => ({
                    ...this.toEntityFields(a as CommentFilterPatternAddDTO),
                    importBatchId,
                })),
            );
        } catch (e) {
            await this.patternModel.deleteMany({ importBatchId });
            this.invalidate();
            throw e;
        }
        const removed = await this.patternModel.deleteMany({
            importBatchId: { $ne: importBatchId },
        });
        await this.patternModel.updateMany(
            { importBatchId },
            { $unset: { importBatchId: 1 } },
        );
        this.invalidate();
        return { imported: items.length, removed: removed.deletedCount ?? 0 };
    }

    private toDto(a: any): CommentFilterPatternDTO {
        return {
            _id: String(a._id),
            pattern: a.pattern,
            type: a.type,
            flag: a.flag,
            action: a.action,
            banDurationHours: a.banDurationHours,
            entityGroup: a.entityGroup,
            obfuscationResistant: !!a.obfuscationResistant,
            enabled: a.enabled !== false,
            note: a.note,
        };
    }
}
