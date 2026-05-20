import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { EntityPropertyDto } from '../dto/entity-property-dto';
import { EntityPropertyService } from '../service/entity-property.service';
import { exec } from 'child_process';

@Controller()
export class EntityPropertyController {
  constructor(private epService: EntityPropertyService) {}

  @EventPattern('register-category')
  registerCategory(ep: EntityPropertyDto) {
    console.info('Registering category', ep.category);
    this.epService.update(ep);
  }
}
