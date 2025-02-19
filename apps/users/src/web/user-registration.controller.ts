import { Controller } from '@nestjs/common';
import { UserService } from '../services/user.service';

@Controller()
export class UserMicroserviceController {
    constructor(private userService: UserService) {}
}
