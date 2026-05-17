import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailTemplate, EmailTemplateSchema } from './email-template.model';
import { GlobalVariable, GlobalVariableSchema } from './global-variable.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: GlobalVariable.name, schema: GlobalVariableSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class NotifyEntityMongoModule {}
