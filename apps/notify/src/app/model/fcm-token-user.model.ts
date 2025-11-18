import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class FcmTokenUserModel {
    _id: String;
    @Prop(String)
    userId: string;
    
    @Prop(String)
    fcmToken: string;
}

export const FcmTokenUserSchema = SchemaFactory.createForClass(FcmTokenUserModel);