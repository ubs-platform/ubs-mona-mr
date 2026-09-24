import { Controller } from '@nestjs/common';
import { LegacyEventPattern } from '@ubs-platform/microservice-setup-util';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { UserKafkaEvents } from '@ubs-platform/users-consts';
import { CommentService } from '../service/comment.service';

@Controller()
export class CommentMicroserviceController {
    constructor(private commentService: CommentService) { }

    @LegacyEventPattern(UserKafkaEvents.USER_EDITED)
    async editUser(u: UserAuthBackendDTO) {
        console.info("User edited : " + u.username)
        await this.commentService.renameCommenterUserFullname(u);
    }
}
