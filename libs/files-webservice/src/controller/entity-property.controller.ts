import { Controller } from '@nestjs/common';
import { LegacyEventPattern } from '@ubs-platform/microservice-setup-util';
import { EntityPropertyDto } from '../dto/entity-property-dto';
import { EntityPropertyService } from '../service/entity-property.service';
import { exec } from 'child_process';

@Controller()
export class EntityPropertyController {
  constructor(private epService: EntityPropertyService) {}

  @LegacyEventPattern('register-category')
  registerCategory(ep: EntityPropertyDto) {
    console.info('Registering category', ep.category);
    this.epService.update(ep);
  }
}
