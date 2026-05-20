import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class GlobalVariable {
  _id: String;

  @Prop()
  name: String;

  //   @Prop()
  //   language: String;

  @Prop(Array<{ language: string; value: string }>)
  values: Array<{ language: string; value: string }> = [];
}

export const GlobalVariableSchema =
  SchemaFactory.createForClass(GlobalVariable);
