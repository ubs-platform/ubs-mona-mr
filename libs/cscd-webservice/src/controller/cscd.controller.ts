import { Controller, Get, Param } from '@nestjs/common';
import {
  CountryDTO,
  LocalityDTO,
  SubdivisionDTO,
} from '@ubs-platform/cscd-common';
import { CscdWebserviceService } from '../service/cscd-webservice.service';

@Controller('cscd')
export class CscdController {
  constructor(private readonly cscdService: CscdWebserviceService) {}

  @Get('countries')
  getCountries(): Promise<CountryDTO[]> {
    return this.cscdService.getCountries();
  }

  @Get('countries/:countryCode/subdivisions')
  getSubdivisions(
    @Param('countryCode') countryCode: string,
  ): Promise<SubdivisionDTO[]> {
    return this.cscdService.getSubdivisions(countryCode);
  }

  @Get('subdivisions/:subdivisionId/localities')
  getLocalities(
    @Param('subdivisionId') subdivisionId: string,
  ): Promise<LocalityDTO[]> {
    return this.cscdService.getLocalities(subdivisionId);
  }
}