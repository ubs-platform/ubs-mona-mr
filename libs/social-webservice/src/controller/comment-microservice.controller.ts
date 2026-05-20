import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { UserKafkaEvents } from '@ubs-platform/users-consts';
import { CommentService } from '../service/comment.service';

@Controller()
export class CommentMicroserviceController {
    constructor(private commentService: CommentService) { }

    @EventPattern(UserKafkaEvents.USER_EDITED)
    async editUser(u: UserAuthBackendDTO) {
        console.info("User edited : " + u.username)
        await this.commentService.renameCommenterUserFullname(u);
    }
}
