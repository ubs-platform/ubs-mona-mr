import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GlobalVariable } from '../model/global-variable.model';
import { Model } from 'mongoose';

// import { GlobalVariableRenameDTO } from '../dto/global-variable-rename';
import {
    GlobalVariableDTO,
    GlobalVariableRenameDTO,
    GlobalVariableWriteDTO,
    VariableExpansion,
} from '@ubs-platform/notify-common';
@Injectable()
export class GlobalVariableService {
    constructor(
        @InjectModel(GlobalVariable.name)
        public globalVariableModel: Model<GlobalVariable>,
    ) {}

    async rename(body: GlobalVariableRenameDTO) {
        let variable = await this.globalVariableModel.findById(body._id);
        if (variable) {
            variable.name = body.name;
            variable = await variable.save();
            return this.toDto(variable);
        }
        throw new NotFoundException('not-found.global-variable');
    }

    async dublicate(id: any) {
        let variable = await this.globalVariableModel.findById(id);
        if (variable) {
            let newVar = new this.globalVariableModel();
            newVar.name = variable.name + ' ' + new Date().toISOString();
            newVar.values = { ...variable.values };
            newVar.markModified('values');
            newVar = await newVar.save();
            return this.toDto(newVar);
        }
        throw new NotFoundException('not-found.global-variable');
    }

    toDto(a?: GlobalVariable): GlobalVariableDTO | null {
        if (a == null) {
            return null;
        }
        return {
            id: a._id.toString(),
            name: a.name.toString(),
            values: a.values,
        };
    }

    toDtoList(list: GlobalVariable[]): GlobalVariableDTO[] {
        return list.map((a) => {
            return this.toDto(a)!;
        });
    }

    async fetchAll() {
        return await this.toDtoList(
            await this.globalVariableModel.find().exec(),
        );
    }

    async deleteTranslation() {}

    async editOne(variable: GlobalVariableWriteDTO) {
        const existing = await this.searchOrCreateNew(variable.name);
        console.info(variable.name, variable.language, existing.values);
        existing.values[variable.language || '_'] = variable.value || undefined;
        existing.markModified('values');
        const saved = await existing.save();
        return this.toDto(saved);
    }

    async findByName(name: string) {
        return await this.globalVariableModel.findOne({
            name,
        });
    }

    private async searchOrCreateNew(name: string) {
        return (
            (await this.globalVariableModel.findOne({
                name,
            })) ||
            new this.globalVariableModel({
                name,
                values: {},
            })
        );
    }

    public async globalVariableApply({ text, language }: VariableExpansion) {
        let textNew = text;
        const TOKEN_START_INDEX = 9;
        const TOKEN_END_INDEX = 2;
        // const text = 'Dear {user},  {your_need} please do not forget {your_need}';
        const variableRegex = /(\{\{global:[0-9\w-_]*\}\})/g;
        // const ac = variableRegex.exec(text);
        const matches = text.matchAll(variableRegex);
        const variableList: string[] = [];
        let variableWithCurlyPhantesisPre;
        do {
            variableWithCurlyPhantesisPre = matches.next()?.value?.[0];
            if (
                variableWithCurlyPhantesisPre &&
                !variableList.includes(variableWithCurlyPhantesisPre)
            ) {
                variableList.push(variableWithCurlyPhantesisPre);
            }
        } while (variableWithCurlyPhantesisPre != null);
        for (let index = 0; index < variableList.length; index++) {
            const variableWithCurlyPhantesis = variableList[index];
            const variableName = variableWithCurlyPhantesis.substring(
                TOKEN_START_INDEX,
                variableWithCurlyPhantesis.length - TOKEN_END_INDEX,
            );
            console.info(variableName);
            const globalVar = (await this.findByName(variableName))?.values!;
            let variableValue = this.getTranslation(globalVar, language!);
            if (variableValue) {
                textNew = textNew
                    .split(variableWithCurlyPhantesis)
                    .join(`${variableValue}`);
            }
        }
        return textNew;
        // console.info(variableList);
    }

    private getTranslation(
        globalVar: { language: string; value: string }[],
        language: string,
    ) {
        console.info(language);
        return globalVar
            ? globalVar[language] ||
                  globalVar[process.env.UNOTIFY_DEFAULT_LANGUAGE || 'en-us'] ||
                  globalVar['en-us']
            : '';
    }
}
