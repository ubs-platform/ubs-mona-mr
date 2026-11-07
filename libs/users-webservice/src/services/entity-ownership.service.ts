import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { FilterQuery, isValidObjectId, Model } from 'mongoose';
import {
    EntityOwnership,
    EntityOwnershipGroup,
} from '@ubs-platform/users-entity-mongo';
import { InjectModel } from '@nestjs/mongoose';
import { EntityOwnershipMapper } from '../mapper/entity-ownership.mapper';
import {
    Capability,
    EntityOwnershipDTO,
    EntityOwnershipGroupIdCheck,
    EntityOwnershipInsertCapabiltyDTO,
    EntityOwnershipSearch,
    EntityOwnershipUserCheck,
    EntityOwnershipUserSearch,
    EntityOwnershipUserSearchV2,
    hasCapabilityFromInnerArray,
    migrateFromStringToCapability,
    UserAuthBackendDTO,
    UserCapabilityDTO,
} from '@ubs-platform/users-common';
import { UserService } from './user.service';
import { Optional } from '@ubs-platform/crud-base-common/utils';

/**
 * Verilen alanlar boşsa BadRequestException fırlatır; sonrasında derleyici bu alanları dolu kabul eder.
 */
function requireFields<T extends object, K extends keyof T>(
    o: T,
    keys: K[],
    ctx: string,
): asserts o is T & { [P in K]-?: NonNullable<T[P]> } {
    const missing = keys.filter((k) => o?.[k] === undefined || o?.[k] === null || o?.[k] === '');
    if (missing.length) {
        throw new BadRequestException(`${ctx}: ${missing.map(String).join(', ')} zorunludur`);
    }
}

/**
 * İçinde boş bir alt dizi olan sorgu "herhangi bir yetki" demektir (hasCapabilityFromInnerArray ile aynı anlam).
 * Mongo'da `$all: []` hiçbir şeyle eşleşmediği için bu durumda filtre uygulanmaz.
 */
function capabilityFilter(requested?: number[][]): Record<string, unknown> {
    if (!requested?.length || requested.some((c) => !c?.length)) return {};
    return { $or: requested.map((cap) => ({ capabilities: { $all: cap } })) };
}

/** Override rolündeki (ADMIN olmayan) kullanıcıya verilen yetkiler */
const OVERRIDE_ROLE_CAPABILITIES = [Capability.VIEW, Capability.ADD, Capability.EDIT, Capability.DELETE];

@Injectable()
export class EntityOwnershipService {
    private readonly logger = new Logger(EntityOwnershipService.name, {
        timestamp: true,
    });

    readonly APPLY_TK_LOTUS_MIGRATIONS = process.env['APPLY_TK_LOTUS_MIGRATIONS'] === undefined || process.env['APPLY_TK_LOTUS_MIGRATIONS'] === 'true';

    constructor(
        @InjectModel(EntityOwnership.name)
        private eoModel: Model<EntityOwnership>,
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
        private userService: UserService,
        private mapper: EntityOwnershipMapper,
    ) { }

    public async onModuleInit() {
        // Migrate old capability field to new capabilities array
        this.logger.log('Starting capability migration...');
        await this.migrateCapabilities();
        this.logger.log('Capability migration completed.');
    }

    private async migrateCapabilities() {
        const allEntities = await this.eoModel.find({
            'userCapabilities.capability': { $exists: true },
        });
        for (const entity of allEntities) {
            let updated = false;
            for (const userCap of entity.userCapabilities) {
                if (userCap.capability && !userCap.capabilities?.length) {
                    userCap.capabilities = migrateFromStringToCapability(userCap.capability, this.APPLY_TK_LOTUS_MIGRATIONS);
                    userCap.capability = undefined;
                    updated = true;
                }
            }
            if (updated) {
                entity.markModified('userCapabilities');
                await entity.save();
                this.logger.log(
                    `Updated entity ${entity.entityGroup}/${entity.entityName}/${entity.entityId} to new capability structure.`,
                );
            }
        }
    }

    // ---------------------------------------------------------------------
    // Ortak sorgu katmanı (Search V2)
    // ---------------------------------------------------------------------

    /**
     * Tüm ownership aramalarının kullandığı tek filtre.
     * - entityGroup / entityName / entityId: verilmişse birebir eşleşir.
     * - entityOwnershipGroupId: verilmişse ownership o gruba ait olmalıdır.
     * - userId: verilmişse kullanıcı ya ownership'te doğrudan istenen yetkiyle bulunmalı ya da ownership'in bağlı olduğu
     *   grupta, aynı üyelik kaydında, aynı entityGroup/entityName için istenen yetkiye sahip olmalıdır.
     *   entityOwnershipGroupId ile birlikte verilirse iki koşul VE ile bağlanır.
     * - requestedCapabilities yalnızca userId ile anlamlıdır; kullanıcı yoksa yetki "kimin için" sorusu cevapsız kalır.
     */
    private async buildFilter(
        s: EntityOwnershipUserSearchV2,
        excludeNullEntityId: boolean,
    ): Promise<FilterQuery<EntityOwnership>> {
        const filter: FilterQuery<EntityOwnership> = {};
        if (s.entityGroup) filter.entityGroup = s.entityGroup;
        if (s.entityName) filter.entityName = s.entityName;
        if (s.entityId) filter.entityId = String(s.entityId);
        else if (excludeNullEntityId) filter.entityId = { $ne: null };
        if (s.entityOwnershipGroupId) filter.entityOwnershipGroupId = s.entityOwnershipGroupId;

        if (s.userId) {
            const groupIds = await this.findAccessibleGroupIds(s);
            filter.$or = [
                {
                    userCapabilities: {
                        $elemMatch: { userId: s.userId, ...capabilityFilter(s.requestedCapabilities) },
                    },
                },
                ...(groupIds.length ? [{ entityOwnershipGroupId: { $in: groupIds } }] : []),
            ];
        }
        return filter;
    }

    /** Kullanıcının bu entity türü için istenen yetkiye sahip olduğu grupların id'leri */
    private async findAccessibleGroupIds(s: EntityOwnershipUserSearchV2): Promise<string[]> {
        if (s.entityOwnershipGroupId && !isValidObjectId(s.entityOwnershipGroupId)) return [];
        const groups = await this.eogModel
            .find(
                {
                    ...(s.entityOwnershipGroupId ? { _id: s.entityOwnershipGroupId } : {}),
                    userCapabilities: {
                        $elemMatch: {
                            userId: s.userId,
                            entityCapabilities: {
                                $elemMatch: {
                                    ...(s.entityGroup ? { entityGroup: s.entityGroup } : {}),
                                    ...(s.entityName ? { entityName: s.entityName } : {}),
                                    ...capabilityFilter(s.requestedCapabilities),
                                },
                            },
                        },
                    },
                },
                { _id: 1 },
            )
            .lean()
            .exec();
        return groups.map((g) => String(g._id));
    }

    private async findOwnerships(
        s: EntityOwnershipUserSearchV2,
        excludeNullEntityId: boolean,
    ): Promise<EntityOwnership[]> {
        return this.eoModel.find(await this.buildFilter(s, excludeNullEntityId)).exec();
    }

    /** Ownership kayıtlarını döner. entityGroup ve entityName zorunludur. */
    public async searchV2(s: EntityOwnershipUserSearchV2): Promise<EntityOwnershipDTO[]> {
        requireFields(s, ['entityGroup', 'entityName'], 'searchV2');
        const found = await this.findOwnerships(s, true);
        return found.map((a) => this.mapper.toDto(a));
    }

    /** Yalnızca entityId'leri döner. entityGroup, entityName ve userId ya da entityOwnershipGroupId zorunludur. */
    public async searchEntityIdsV2(s: EntityOwnershipUserSearchV2): Promise<string[]> {
        requireFields(s, ['entityGroup', 'entityName'], 'searchEntityIdsV2');
        if (!s.userId && !s.entityOwnershipGroupId) {
            throw new BadRequestException('searchEntityIdsV2: userId veya entityOwnershipGroupId zorunludur');
        }
        const found = await this.eoModel
            .find(await this.buildFilter(s, true), { entityId: 1 })
            .lean()
            .exec();
        return found.map((a) => String(a.entityId));
    }

    /**
     * Tek bir varlık için kullanıcının yetkisini döner (yoksa null).
     * Sıra: ownership'teki doğrudan yetki -> bağlı grup -> (roleOverride ise) override rolleri.
     * entityGroup, entityName, entityId ve userId zorunludur.
     */
    public async findUserCapabilityV2(
        s: EntityOwnershipUserSearchV2,
        options: { roleOverride: boolean },
    ): Promise<Optional<UserCapabilityDTO>> {
        requireFields(s, ['entityGroup', 'entityName', 'entityId', 'userId'], 'findUserCapabilityV2');

        const ownership = await this.eoModel
            .findOne({ entityGroup: s.entityGroup, entityName: s.entityName, entityId: String(s.entityId) })
            .exec();
        if (!ownership) return null;
        if (s.entityOwnershipGroupId && ownership.entityOwnershipGroupId !== s.entityOwnershipGroupId) return null;

        const direct = this.findUserCapabilityInEntity(ownership, s.userId, s.requestedCapabilities);
        if (direct) return direct;

        const group =
            ownership.entityOwnershipGroupId && isValidObjectId(ownership.entityOwnershipGroupId)
                ? await this.eogModel.findById(ownership.entityOwnershipGroupId).exec()
                : null;

        const fromGroup = this.findUserCapabilityInGroup(group, s);
        if (fromGroup) return fromGroup;

        if (!options.roleOverride) return null;
        // TODO(overriderRoles): Tasarım tekrar düşünülecek.
        // - Amaç: ownership'i olmayan ama önemli rolü olan kullanıcıların (ör. moderatör) override edebilmesi.
        //   ADMIN kontrolü çoğu serviste zaten ilk kontrol olarak yapılıyor; buradaki ADMIN dalı büyük ölçüde tekrar.
        // - Alternatif: rol yetkilerini ownership kayıtlarına gömmek yerine ayrı bir tabloda
        //   (role, entityGroup, entityName, capabilities) tutup buradan vermek. Böylece her kayıtta overriderRoles taşınmaz
        //   ve moderatör gibi roller entity türü bazında, sabit VIEW/ADD/EDIT/DELETE seti yerine net yetkiyle tanımlanır.
        // - Mevcut hata: `[]` truthy olduğu için grubun overriderRoles'una hiç düşülmüyor. Düzeltilirse erişim GENİŞLER,
        //   bu yüzden karar verilene kadar önceki davranış korundu.
        const roleOverrides = ownership.overriderRoles || group?.overriderRoles;
        return this.checkRoleOverride(roleOverrides ?? [], s.userId, s.requestedCapabilities);
    }

    private findUserCapabilityInEntity(
        entityOwnership: EntityOwnership,
        userId: string,
        requestedCapabilities?: number[][],
    ): Optional<UserCapabilityDTO> {
        const found = entityOwnership.userCapabilities?.find(
            (uc) => uc.userId === userId && hasCapabilityFromInnerArray(uc.capabilities ?? [], requestedCapabilities),
        );
        return found ? { userId: found.userId!, capabilities: found.capabilities } : null;
    }

    private findUserCapabilityInGroup(
        group: Optional<EntityOwnershipGroup>,
        s: EntityOwnershipUserSearchV2,
    ): Optional<UserCapabilityDTO> {
        for (const uc of group?.userCapabilities ?? []) {
            if (uc.userId !== s.userId) continue;
            const match = uc.entityCapabilities?.find(
                (ec) =>
                    ec.entityGroup === s.entityGroup &&
                    ec.entityName === s.entityName &&
                    hasCapabilityFromInnerArray(ec.capabilities ?? [], s.requestedCapabilities),
            );
            if (match) return { userId: uc.userId, capabilities: match.capabilities };
        }
        return null;
    }

    private async checkRoleOverride(
        roleOverrides: string[],
        userId: string,
        requestedCapabilities?: number[][],
    ): Promise<Optional<UserCapabilityDTO>> {
        if (!roleOverrides.length) return null;

        const user: Optional<UserAuthBackendDTO> = await this.userService.findUserAuthBackend(userId);
        if (!user?.roles?.length) return null;

        // Admin her şeyi override eder
        if (user.roles.includes('ADMIN')) {
            return { userId: user.id, capabilities: requestedCapabilities?.[0] ?? [] };
        }

        // Override rolü sabit yetki setini verir; istenen yetkiyi karşılamıyorsa erişim yoktur (ör. OWNER istendiyse).
        if (!user.roles.some((role) => roleOverrides.includes(role))) return null;
        return hasCapabilityFromInnerArray(OVERRIDE_ROLE_CAPABILITIES, requestedCapabilities)
            ? { userId: user.id, capabilities: [...OVERRIDE_ROLE_CAPABILITIES] }
            : null;
    }

    // ---------------------------------------------------------------------
    // Eski API'ler: message pattern'ler değişmesin diye V2'ye çeviren ince sarmalayıcılar
    // ---------------------------------------------------------------------

    /** check-ownership */
    public async findInsertedUserCapability(
        eo: EntityOwnershipUserCheck,
        checkRoleOverride: boolean,
    ): Promise<Optional<UserCapabilityDTO>> {
        return this.findUserCapabilityV2(
            {
                entityGroup: eo.entityGroup,
                entityName: eo.entityName,
                entityId: eo.entityId,
                userId: eo.userId,
                entityOwnershipGroupId: eo.entityOwnershipGroupId,
                requestedCapabilities: eo.requestedCapabilities,
            },
            { roleOverride: checkRoleOverride },
        );
    }

    /** search-ownership: kullanıcı filtresi olmadan kimlik ile arama */
    public async search(sk: EntityOwnershipSearch): Promise<EntityOwnershipDTO[]> {
        requireFields(sk, ['entityGroup', 'entityName'], 'search');
        const found = await this.findOwnerships(
            { entityGroup: sk.entityGroup, entityName: sk.entityName, entityId: sk.entityId },
            false,
        );
        return found.map((a) => this.mapper.toDto(a));
    }

    /** search-ownership-user */
    async searchByUser(eo: EntityOwnershipUserSearch): Promise<EntityOwnershipDTO[]> {
        requireFields(eo, ['userId'], 'searchByUser');
        return this.searchV2(this.fromUserSearch(eo));
    }

    /** search-entity-ids-by-user */
    async searchEntityIdsByUser(eo: EntityOwnershipUserSearch): Promise<string[]> {
        requireFields(eo, ['userId'], 'searchEntityIdsByUser');
        return this.searchEntityIdsV2(this.fromUserSearch(eo));
    }

    /**
     * search-ownership-by-eog-id: grubun bu türdeki tüm varlıkları.
     * Kullanıcı kontrolü yapmaz; çağıran taraf grup üyeliğini doğrulamış olmalıdır.
     */
    async searchByEntityIdsByEogroup(eo: EntityOwnershipGroupIdCheck): Promise<string[]> {
        requireFields(eo, ['entityOwnershipGroupId'], 'searchByEntityIdsByEogroup');
        return this.searchEntityIdsV2({
            entityGroup: eo.entityGroup,
            entityName: eo.entityName,
            entityOwnershipGroupId: eo.entityOwnershipGroupId,
        });
    }

    async hasOwnershipsByEogId(eogId: string): Promise<boolean> {
        return !!(await this.eoModel.exists({ entityOwnershipGroupId: eogId }));
    }

    private fromUserSearch(eo: EntityOwnershipUserSearch): EntityOwnershipUserSearchV2 {
        return {
            entityGroup: eo.entityGroup,
            entityName: eo.entityName,
            userId: eo.userId,
            entityOwnershipGroupId: eo.entityOwnershipGroupId,
            requestedCapabilities: eo.requestedCapabilities,
        };
    }

    // ---------------------------------------------------------------------
    // Yazma işlemleri
    // ---------------------------------------------------------------------

    async ensureTeamOwnership(dto: EntityOwnershipDTO): Promise<void> {
        if (!dto.entityGroup || !dto.entityName || !dto.entityId || !dto.entityOwnershipGroupId || dto.userCapabilities?.length) {
            throw new BadRequestException('A team and an entity identity are required');
        }
        const identity = { entityGroup: dto.entityGroup, entityName: dto.entityName, entityId: dto.entityId };
        try {
            await this.eoModel.updateOne(identity, { $setOnInsert: {
                ...identity, entityOwnershipGroupId: dto.entityOwnershipGroupId,
                userCapabilities: [], overriderRoles: dto.overriderRoles,
            } }, { upsert: true });
        } catch (error: unknown) {
            if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) throw error;
        }
        const ownership = await this.eoModel.findOne(identity).exec();
        if (!ownership || ownership.entityOwnershipGroupId !== dto.entityOwnershipGroupId || ownership.userCapabilities.length) {
            throw new ConflictException('Entity already has a different owner');
        }
    }

    public async edit(eoDto: EntityOwnershipDTO): Promise<void> {
        this.logger.debug('EO EDIT', eoDto.entityGroup, eoDto.entityId, eoDto.entityName);
        const entity = await this.eoModel.findOne(this.identityOf(eoDto)).exec();
        if (!entity) {
            throw new Error('EntityOwnership not found for edit.');
        }
        this.mapper.toEntityEditWithMembers(entity, eoDto);
        await entity.save();
    }

    async insert(eoDto: EntityOwnershipDTO): Promise<void> {
        this.logger.debug('EO INSERT', eoDto.entityGroup, eoDto.entityId, eoDto.entityName);
        const existing = await this.eoModel.findOne(this.identityOf(eoDto)).exec();
        let entity;
        if (existing) {
            entity = existing;
            this.mapper.toEntityEdit(entity, eoDto);
        } else {
            entity = this.mapper.toEntity(eoDto);
        }
        await entity.save();
    }

    /**
     * Kullanıcının ownership'teki doğrudan kaydını günceller, yoksa ekler.
     * (Önceden grup/override üzerinden erişimi olan kullanıcı "zaten var" sanılıp eklenmiyordu.)
     */
    public async insertUserCapability(oe: EntityOwnershipInsertCapabiltyDTO): Promise<void> {
        requireFields(oe, ['entityGroup', 'entityName', 'entityId', 'userId'], 'insertUserCapability');
        const identity = this.identityOf(oe);

        const updated = await this.eoModel.updateOne(
            { ...identity, 'userCapabilities.userId': oe.userId },
            { $set: { 'userCapabilities.$[related].capabilities': oe.capabilities } },
            { arrayFilters: [{ 'related.userId': oe.userId }] },
        );
        if (updated.matchedCount > 0) return;

        const pushed = await this.eoModel.updateOne(
            { ...identity, 'userCapabilities.userId': { $ne: oe.userId } },
            { $push: { userCapabilities: { userId: oe.userId, capabilities: oe.capabilities } } },
        );
        if (pushed.matchedCount === 0) {
            this.logger.warn('User capability eklenemedi (ownership bulunamadı):', identity);
        }
    }

    /**
     * Kullanıcının bu ownership'teki doğrudan kaydını tamamen siler.
     * NOT: requestedCapabilities (ör. lotus'un [[LIBRARY]] çağrısı) şu an dikkate alınmıyor; kullanıcının tüm yetkileri
     * kaldırılır. Bugün bir kullanıcının tek yetkisi olduğu için (LIBRARY ile EDIT bir arada olmuyor) sorun yaratmıyor.
     * Birden fazla yetki bir arada tutulmaya başlanırsa burası yalnızca istenen yetkileri $pull edecek şekilde değişmeli.
     */
    public async removeUserCapability(eo: EntityOwnershipUserCheck) {
        requireFields(eo, ['entityGroup', 'entityName', 'entityId', 'userId'], 'removeUserCapability');
        return this.eoModel.updateOne(this.identityOf(eo), {
            $pull: { userCapabilities: { userId: eo.userId } },
        });
    }

    public async deleteOwnership(sk: EntityOwnershipSearch): Promise<void> {
        requireFields(sk, ['entityGroup', 'entityName', 'entityId'], 'deleteOwnership');
        await this.eoModel.deleteOne(this.identityOf(sk));
    }

    private identityOf(o: { entityGroup?: string; entityName?: string; entityId?: string }) {
        return { entityGroup: o.entityGroup, entityName: o.entityName, entityId: o.entityId };
    }
}
