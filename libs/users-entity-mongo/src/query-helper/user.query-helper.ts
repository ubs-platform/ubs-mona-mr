import { Model, Document } from 'mongoose';
import { QueryHelper } from '@ubs-platform/entity-base';
import { User } from '../entity/user.model';
import { UserAdminSearch } from 'libs/users-common/src/user-admin-search.dto';
import { SearchRequest } from '@ubs-platform/crud-base-common';

export class UserQueryHelper extends QueryHelper<User | Document<User>> {

    constructor(private userModel: Model<User>) {
        super();
    }

    async delete(id: string): Promise<void> {
        await this.userModel.findByIdAndDelete(id).exec();
    }

    async findById(id: string) {
        return await this.userModel.findById(id).exec();
    }

    async save(entity: User | Document<User>) {
        if (entity instanceof Document) {
            await entity.save();
            return entity.toObject() as User;
        }
        const saved = await this.userModel
            .findByIdAndUpdate((entity as User)._id, entity, { upsert: true, new: true })
            .exec();
        return saved ? saved.toObject() as User : null;
    }

    searchParams(searchAndPagination: (UserAdminSearch & SearchRequest) | undefined) {
        const s: any = {};
        if (searchAndPagination?.name) {
            s.name = { $regex: new RegExp(searchAndPagination.name, 'i') };
        }
        if (searchAndPagination?.username) {
            s.username = { $regex: new RegExp(searchAndPagination.username, 'i') };
        }
        return s;
    }

    async findAll() {
        return await this.userModel.find().exec();
    }

    async findByUsernameOrEmail(username: string, email: string) {
        return await this.userModel
            .find({ $or: [{ username }, { primaryEmail: email }] })
            .exec();
    }

    async findByEmailExcludeUserId(primaryEmail: string, userIdExclude: any) {
        return await this.userModel
            .find({ primaryEmail, _id: { $ne: userIdExclude } })
            .exec();
    }

    async findOneByLoginOrEmail(login: string) {
        return await this.userModel
            .findOne({
                $and: [{ $or: [{ username: login }, { primaryEmail: login }] }],
            })
            .exec();
    }

    async countWithRoles(userId: string, roles: string[]) {
        return await this.userModel
            .countDocuments({ id: userId, roles: { $in: roles } })
            .exec();
    }
}
