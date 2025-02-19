import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../domain/user.model';
import { EmailService } from './email.service';
import { UserCandiate, UserCandiateDoc } from '../domain/user-candiate.model';
import { Model, ObjectId } from 'mongoose';
import { retry } from 'rxjs';
import { UserRegisterDTO } from '@ubs-platform/users-common';

@Injectable()
export class UserRegisterService {
    constructor(
        @InjectModel(UserCandiate.name)
        private userCandiateModel: Model<UserCandiate>,
        // @Inject('KAFKA_CLIENT') private client: ClientKafka,
        private emailService: EmailService,
    ) {}

    async renewOrCheckOld(id?: string) {
        let a = id ? await this.userCandiateModel.findById(id) : null;
        if (a) {
        } else {
            let a = new this.userCandiateModel();
            a = await a.save();
            return this.toDto(a);
        }
    }

    transferToEntity(dto: UserRegisterDTO, a: UserCandiate) {}

    toDto(a: UserCandiate) {}

    async register(uregister: UserRegisterDTO) {
        let a = await this.userCandiateModel.findById(uregister.registerId);
        if (a) {
        } else {
            throw new NotFoundException('user-candiate', uregister.registerId);
        }
    }
}
