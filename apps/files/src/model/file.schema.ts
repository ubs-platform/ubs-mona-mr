import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';
export class ImageDataScaled {
  width: number;
  file: Buffer | { buffer: any };
  useSame: boolean = false;
}
@Schema()
export class FileModel {
  _id?: any;
  @Prop(Buffer)
  file: Buffer;

  @Prop(String)
  name: string;

  @Prop(String)
  category: string;

  @Prop(String)
  mimeType: string;

  @Prop(Number)
  length: number;

  @Prop({
    type: Date,
    default: new Date(),
  })
  date: Date;

  @Prop({
    type: Date,
    default: new Date(),
  })
  lastFetch: Date;

  @Prop(String)
  userId: String;

  @Prop({ type: Boolean, default: false })
  volatile: Boolean;

  @Prop({ type: Date, default: new Date(Date.now() + 3600000) })
  expireAt: Date;

  @Prop({ type: [ImageDataScaled], default: [] })
  scaledImages: ImageDataScaled[] = [];
}

export type FileDoc = FileModel & Document;
export const FileSchema = SchemaFactory.createForClass(FileModel);
