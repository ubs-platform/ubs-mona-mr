import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { JwtAuthGuard } from '@ubs-platform/users-microservice-helper';
import { LlmOperationService } from '../service/llm-operation.service';

@Controller('llm-models')
export class LlmModelsController {
    constructor(private llmOpService: LlmOperationService) {}

    @Get()
    async findMessagesBySessionIdPaged() {
        return await this.llmOpService.fetchAvailableModels();
    }
}
