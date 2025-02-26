import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatMessage } from '../model/chat-message-model';
import { Model } from 'mongoose';
import { ChatSession } from '../model/chat-session.model';
import Ollama from 'ollama';

@Injectable()
export class LlmOperationService {
    private readonly ENV_KEY_U_SUPRLAMA_OLLAMA_URL = 'U_SUPERLAMA_OLLAMA_URL';
    private readonly OLLAMA_URL =
        process.env[this.ENV_KEY_U_SUPRLAMA_OLLAMA_URL];

    constructor(
        @InjectModel(ChatMessage.name)
        private chatMessageModel: Model<ChatMessage>,
        @InjectModel(ChatSession.name)
        private chatSessionModel: Model<ChatSession>,
    ) {}
}
