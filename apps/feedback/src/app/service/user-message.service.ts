import { Injectable } from '@nestjs/common';
import { UserMessageModel } from '../model/user-message.model';

import { FilterQuery, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { BaseCrudService } from '@ubs-platform/crud-base';
import {
    IUserMessageDto,
    IUserMessageSearch,
} from '@ubs-platform/feedback-common';

@Injectable()
export class UserMessageService extends BaseCrudService<
    UserMessageModel,
    IUserMessageDto,
    IUserMessageDto,
    IUserMessageSearch
> {
    constructor(
        @InjectModel(UserMessageModel.name) private _m: Model<UserMessageModel>,
        private emailService: EmailService,
    ) {
        super(_m);
    }

    async afterCreate(i: IUserMessageDto): Promise<void> {
        await this.emailService.sentUserMessage(i);
    }

    async resolve(id: string, reply: string): Promise<IUserMessageDto> {
        const exist = (await this._m.findById(id))!;
        exist.reply = reply;
        exist.status = 'RESOLVED';
        await exist.save();

        const out = await this.toOutput(exist);
        await this.emailService.sentUserMessageResolvedMail(out);
        return out;
    }

    toOutput(m: UserMessageModel): IUserMessageDto | Promise<IUserMessageDto> {
        return {
            message: m.message,
            email: m.email,
            firstName: m.firstName,
            lastName: m.lastName,
            type: m.type,
            creationDate: m.creationDate,
            relatedUrl: m.relatedUrl,
            status: m.status,
            phoneNumber: m.phoneNumber,
            localeCode: m.localeCode,
            fileUrls:
                m.fileUrls?.map((a) => {
                    return {
                        url: a.url,
                        title: a.url,
                    };
                }) || [],
            summary: m.summary || 'WAITING',
            reply: m.reply,
            _id: m._id,
        } as IUserMessageDto;
    }
    moveIntoModel(
        model: UserMessageModel,
        i: IUserMessageDto,
    ): UserMessageModel | Promise<UserMessageModel> {
        model.email = i.email;
        model.firstName = i.firstName;
        model.lastName = i.lastName;
        model.type = i.type;
        model.fileUrls = i.fileUrls;
        model._id = i._id;
        model.message = i.message;
        model.phoneNumber = i.phoneNumber;
        model.summary = i.summary;
        model.localeCode = i.localeCode;
        model.relatedUrl = i.relatedUrl;
        model.fileUrls =
            i.fileUrls?.map((a) => {
                return {
                    url: a.url,
                    title: a.url,
                };
            }) || [];
        if (model.creationDate == null) {
            model.creationDate = new Date();
        }
        if (model.status == null) {
            model.status = 'WAITING';
        }
        return model;
    }
    searchParams(s: IUserMessageSearch): FilterQuery<UserMessageModel> {
        const c = {} as FilterQuery<UserMessageModel>;
        if (s._id) {
            c._id = s._id;
        }
        if (s.firstName) {
            c.firstName = this.regexSearch(s.firstName);
        }
        if (s.lastName) {
            c.lastName = this.regexSearch(s.lastName);
        }
        if (s.message) {
            c.message = this.regexSearch(s.message);
        }
        if (s.phoneNumber) {
            c.phoneNumber = this.regexSearch(s.phoneNumber);
        }
        if (s.summary) {
            c.summary = this.regexSearch(s.summary);
        }
        if (s.type) {
            c.type = s.type;
        }
        if (s.status) {
            c.status = s.status;
        }
        if (s.creationDateGte) {
            c.creationDate = { $gte: s.creationDateGte };
        }
        if (s.creationDateLte) {
            c.creationDate = { $lte: s.creationDateLte };
        }
        return c;
    }

    private regexSearch(str: string): any {
        return { $regex: '.*' + str + '.*' };
    }
}
