import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EntityProperty } from '../model/entity-property.schema';
import { Model } from 'mongoose';
import {
  EntityPropertyDto,
  EntityPropertySearchDto,
} from '../dto/entity-property-dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class EntityPropertyService {
  constructor(
    @InjectModel(EntityProperty.name)
    private entityPropertyModel: Model<EntityProperty>
  ) {}

  async update(ep: EntityPropertyDto) {
    let model = await this.entityPropertyModel.findOne({
      category: ep.category,
    });
    if (!model) {
      model = new this.entityPropertyModel();
      model.category = ep.category;
    }
    model.serviceTcpHost = ep.serviceTcpHost;
    model.serviceTcpPort = ep.serviceTcpPort;
    const finalVal = await model.save();
    return this.mapToDto(finalVal);
  }

  async findOne(
    ep: EntityPropertySearchDto
  ): Promise<EntityPropertyDto | null> {
    let model = await this.entityPropertyModel.findOne({
      category: ep.category,
    });
    if (model) {
      return this.mapToDto(model);
    }
    return null;
    // model.nestTcpUrl = ep.nestTcpUrl;
    // model.maxFileSizeBytes = ep.maxFileSizeBytes;
    // model.volatileAtInitialized = ep.volatileAtInitialized;
  }

  private mapToDto(
    model: import('mongoose').Document<unknown, {}, EntityProperty> &
      EntityProperty & { _id: import('mongoose').Types.ObjectId }
  ) {
    return {
      category: model.category,
      serviceTcpPort: model.serviceTcpPort,
      serviceTcpHost: model.serviceTcpHost,
    } as EntityPropertyDto;
  }
}
