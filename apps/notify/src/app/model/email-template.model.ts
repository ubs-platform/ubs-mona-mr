import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class EmailTemplate {
  _id: String;

  @Prop()
  htmlContent: String;

  @Prop({ unique: true })
  name: String;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);
