import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatMessage } from '../model/chat-message-model';
import { Model } from 'mongoose';
import { ChatSession } from '../model/chat-session.model';
import Ollama, { ChatResponse } from 'ollama';
import { ChatMessageDTO } from '@ubs-platform/superlama-common';
import { Observable } from 'rxjs';

@Injectable()
export class LlmOperationService {
    private readonly ENV_KEY_U_SUPRLAMA_OLLAMA_URL = 'U_SUPERLAMA_OLLAMA_URL';
    private readonly OLLAMA_URL =
        process.env[this.ENV_KEY_U_SUPRLAMA_OLLAMA_URL];

    constructor() {}

    generateResponse(msgs: ChatMessageDTO[]) {
        return new Observable<ChatResponse>((subscriber) => {
            const tail = msgs[msgs.length - 1];
            if (tail.senderType == 'USER') {
                const modelName = 'deepseek-r1:7b';
                const outputx = Ollama.chat({
                    model: modelName,
                    stream: true,
                    messages: msgs.map((a) => {
                        return {
                            content: a.textContent,
                            role: a.senderType == 'USER' ? 'user' : 'assistant',
                        };
                    }),
                });

                const asyncOp = async () => {
                    for await (const part of await outputx) {
                        subscriber.next(part);
                        if (part.done) {
                            subscriber.complete();
                        }
                    }
                };
                asyncOp();
            }
        });
    }
}
