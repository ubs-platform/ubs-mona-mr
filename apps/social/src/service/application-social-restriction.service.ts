import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationSocialRestriction } from '../model/application-social-restriction';
import {
    ApplicationSocialRestrictionAddDTO,
    ApplicationSocialRestrictionDTO,
    ApplicationSocialRestrictionSearchDTO,
} from '@ubs-platform/social-common';

@Injectable()
export class ApplicationSocialRestrictionService {
    constructor(
        @InjectModel(ApplicationSocialRestriction.name)
        private readonly restrictionModel: Model<ApplicationSocialRestriction>,
    ) {}

    // Kullanıcıya yorum yapma engeli ekleme. Tarih yoksa endless true olacak
    async restrictUser(
        restrictionAdd: ApplicationSocialRestrictionAddDTO,
    ): Promise<ApplicationSocialRestrictionDTO> {
        let untilDateUtc: Date;
        const dateLnth = restrictionAdd.until?.trim()?.length;
        const endless = dateLnth == null || dateLnth == 0;

        if (!endless) {
            const date = new Date(restrictionAdd.until!);
            // 
            untilDateUtc = new Date(
                Date.UTC(
                    date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate(),
                    date.getUTCHours(),
                    date.getUTCMinutes(),
                    date.getUTCSeconds(),
                ),
            );
        }

        const until = untilDateUtc!;
        const ovo = await this.userRestrictionDetailsRaw(restrictionAdd);
        if (ovo) {
            ovo.endless = endless;
            ovo.until = until;
            ovo.note = restrictionAdd.note;
            await ovo.save();
            return this.toDto(ovo)!;
        } else {
            const restriction = new this.restrictionModel({
                userId: restrictionAdd.userId,
                restriction: restrictionAdd.restriction,
                until,
                note: restrictionAdd.note,
                endless,
            });

            await restriction.save();
            return this.toDto(restriction)!;
        }
    }

    async userRestrictionDetailsRaw(
        restrictionSearch: ApplicationSocialRestrictionSearchDTO,
    ) {
        await this.cleanExpired();
        console.info(new Date());
        const data = await this.restrictionModel.findOne({
            userId: restrictionSearch.userId,
            restriction: restrictionSearch.restriction,
            $or: [{ endless: true }, { until: { $gte: new Date() } }],
        });
        console.info(data);
        return data;
    }

    async cleanExpired() {
        console.info(
            await this.restrictionModel.deleteMany({
                endless: { $eq: false },
                until: { $lt: new Date() },
            }),
        );
    }

    // Kullanıcının yorum yapma engelinin olup olmadığını kontrol etme
    async userRestrictionDetails(
        restrictionSearch: ApplicationSocialRestrictionSearchDTO,
    ): Promise<ApplicationSocialRestrictionDTO> {
        const restriction =
            await this.userRestrictionDetailsRaw(restrictionSearch);
        return this.toDto(restriction!)!;
    }

    private toDto(
        restriction?: import('mongoose').Document<
            unknown,
            any,
            ApplicationSocialRestriction
        > &
            Omit<
                ApplicationSocialRestriction & Required<{ _id: String }>,
                never
            >,
    ): ApplicationSocialRestrictionDTO | null {
        if (restriction) {
            return {
                userId: restriction.userId,
                restriction: restriction.restriction,
                endless: restriction.endless,
                until: restriction.until?.toISOString(),
                note: restriction.note,
            } as ApplicationSocialRestrictionDTO;
        } else {
            return null;
        }
    }

    async isUserRestrictedFrom(
        restrictionSearch: ApplicationSocialRestrictionSearchDTO,
    ): Promise<boolean> {
        const now = new Date();
        const restriction = await this.restrictionModel.findOne({
            userId: restrictionSearch.userId,
            restriction: restrictionSearch.restriction,
            $or: [{ endless: true }, { until: { $gte: now } }],
        });

        return !(await this.userRestrictionDetails(restrictionSearch));
    }

    async removeCommentRestriction(
        restrictionRemove: ApplicationSocialRestrictionSearchDTO,
    ): Promise<void> {
        await this.restrictionModel.deleteMany({
            userId: { $eq: restrictionRemove.userId },
            restriction: { $eq: restrictionRemove.restriction },
        });
    }
}
