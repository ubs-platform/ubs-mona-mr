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

    generateTestoResponse(msgs: ChatMessageDTO[]) {
        return new Observable<ChatResponse>((subscriber) => {
            const testo = `<think>
                Kyle Broflovski has always been considered one of the most intelligent children in South Park, and whenever crazy things are happening in South Park, Kyle and his super best friend, Stan, are there to provide the voice of reason and help resolve problems, often with a comforting 'gay little speech', something that has become Kyle's trademark amongst his friends... for better or for worse. He has a loving if stern father named Gerald, a local lawyer, and a mother, Sheila, known for her interest in social justice and politics, and of course, there's nobody Kyle cares more about than his little brother, Ike Broflovski -- despite the latter's adoption and the occasional game of 'kick the baby', they care about each other and Kyle will do anything to protect him, even go up against evil Visitors. All members of the Broflovski family are known for their strong moral centers and standing up for what they believe in... though not necessarily always to success. Nonetheless, even when times seem their darkest, Kyle will never back down from what he believes in.

                </think> 
Kyle Broflovski, South Park'ın Yahudi karakteri. Matt Stone tarafından seslendirilmektedir. Saçları Matt Stone'un saçlarına benzetilmek istenmiştir, zaten Kyle karakteri Stone'un çocukluğu baz alınarak oluşturulmuş bir karakterdir. Çizgi filmdeki dört ana karakterden biridir. Eric Cartman ile birbirlerinden ölesiye nefret etmelerine rağmen, birbirlerinin hayatlarını defalarca kurtarmışlardır. Kan grubu AB olup Cartman'ın kan grubuyla aynıdır. Ailesi çok tutucudur. Babası Gerald Broflovski bir avukat, annesi Sheila Broflovski ise bir ev hanımıdır. Kyle'ın İke isimli 5 yaşında, dahi, Kanadalı evlatlık bir kardeşi vardır. Fiziksel görünümü oldukça büyük, kızıl renkli kabarcık saçlara sahip olmasıyla dikkat çeker.Ancak saçlar şapkası nedeniyle görünmemektedir. Orta kiloda, 65 cm boyundadır.Ayrıca 5.sezonda dedelerinin Polonya'dan göçtüğünü öğreniyoruz.

En sevdiği arkadaşı ise Stan Marsh'tır. Eric Cartman başına buyruk bir karakter olduğundan ayrı tutulursa, çoğu durumda grubun lideri konumundadır.

Kenny'nin öldüğü her bölüm Stan "Oh my God, they killed Kenny!" (Aman Tanrım! Kenny'i öldürdüler!) der ve Kyle da ona eş olarak "You bastards!" (Sizi piçler!) der. Ama Kenny artık ölmediği için bu sözler duyulmaz. Ayrıca Kyle, turuncu bir mont, yeşil değişik bir şapka ve de koyu yeşil bir pantolon giyer.

Kyle kasabadaki sayılı Yahudilerden biridir ve bu yüzden kendini grup arkadaşlarından ve diğerlerinden dışlanmış hissetmektedir. Ülkedeki Yahudi kesimi temsil etmekte ve onun üzerinden bu gruba göndermeler yapılmaktadır.

Kyle'ın müzik, video oyunları ve basketbola karşı özel bir ilgisi ve yeteneği bulunmaktadır. 
`
                .split(' ')
                .filter((a) => a);
            for (let index = 0; index < testo.length; index++) {
                const element = testo[index] + ' ';
                setTimeout(() => {
                    subscriber.next({
                        done: false,
                        message: { content: element, role: 'assistant' },
                        created_at: new Date(),
                        model: 'Testo',
                        total_duration: 31.69,
                    } as any);
                    if (testo.length - 1 == index) {
                        subscriber.complete();
                    }
                }, index * 50);
            }
        });
    }

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
