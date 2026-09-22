import { Injectable } from '@nestjs/common';
import { UserMessage } from '@ubs-platform/feedback-entity-mongo';

import { FilterQuery, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { BaseCrudService, MongoRepositoryWrap } from '@ubs-platform/crud-base';
import {
    IUserMessageDto,
    IUserMessageSearch,
} from '@ubs-platform/feedback-common';

@Injectable()
export class UserMessageService extends BaseCrudService<
    UserMessage,
    string,
    IUserMessageDto,
    IUserMessageDto,
    IUserMessageSearch
> {
    constructor(
        @InjectModel(UserMessage.name) private _m: Model<UserMessage>,
        private emailService: EmailService,
    ) {
        super(new MongoRepositoryWrap<UserMessage>(_m));
    }

    generateNewModel(): UserMessage {
        return new this._m();
    }

    getIdFieldNameFromInput(i: IUserMessageDto): string {
        return i._id!;
    }
    getIdFieldNameFromModel(i: UserMessage): string {
        return i._id as string;
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

    toOutput(m: UserMessage): IUserMessageDto | Promise<IUserMessageDto> {
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
        model: UserMessage,
        i: IUserMessageDto,
    ): UserMessage | Promise<UserMessage> {
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
    async searchParams(
        s: IUserMessageSearch,
    ): Promise<FilterQuery<UserMessage>> {
        const c = {} as FilterQuery<UserMessage>;
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
            c.creationDate = { $gte: new Date(s.creationDateGte) };
        }
        if (s.creationDateLte) {
            c.creationDate = {
                ...(c.creationDate || {}),
                $lte: new Date(s.creationDateLte),
            };
        }
        return c;
    }

    private regexSearch(str: string): any {
        return { $regex: '.*' + str + '.*' };
    }

    // Sends the user message to the configured feedback vendor. Throws an error if the vendor URL is not configured or if the request fails.
    // If reseller admin found a issue related with UBS Project, it should be reported to the feedback vendor, defaultly to Tetakent.
    async sendToVendor(message: IUserMessageDto): Promise<void> {
        const vendorUrl = process.env.U_FEEDBACK_VENDOR || "https://lotus.tetakent.com/api/feedback";

        const res = await fetch(vendorUrl + "/user-message", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        if (!res.ok) {
            throw new Error(`Failed to send message to vendor: ${res.statusText}`);
        }
    }
}
