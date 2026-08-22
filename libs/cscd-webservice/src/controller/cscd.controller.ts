import { Controller, Get, Param } from '@nestjs/common';
import {
  CountryDTO,
  LocalityDTO,
  SubdivisionDTO,
  LocalityInfoRequest,
  LocalityInfoResponse,
} from '@ubs-platform/cscd-common';
import { CscdWebserviceService } from '../service/cscd-webservice.service';
import { MessagePattern } from '@nestjs/microservices';
import { CacheManagerService } from '@ubs-platform/cache-manager';

@Controller('cscd')
export class CscdController {
  constructor(private readonly cscdService: CscdWebserviceService,
    private readonly cacheManager: CacheManagerService
  ) { }

  @Get('countries')
  async getCountries(): Promise<CountryDTO[]> {
    return await this.cacheManager.getOrCallAsync(
      'cscd_countries',
      () => this.cscdService.getCountries(),
      { livetime: 86400000 } // 24 saat
    );
  }

  @Get('countries/:countryCode/subdivisions')
  async getSubdivisions(
    @Param('countryCode') countryCode: string,
  ): Promise<SubdivisionDTO[]> {
    return await this.cacheManager.getOrCallAsync(
      'cscd_subdivisions_' + countryCode,
      () => this.cscdService.getSubdivisions(countryCode),
      { livetime: 86400000 } // 24 saat
    );
  }

  @Get('countries/:countryCode/subdivisions/:subdivisionCode/localities')
  async getLocalities(
    @Param('countryCode') countryCode: string,
    @Param('subdivisionCode') subdivisionCode: string,
  ): Promise<LocalityDTO[]> {

    return await this.cacheManager.getOrCallAsync(
      'cscd_localities_' + countryCode + '_' + subdivisionCode,
      () => this.cscdService.getLocalities(countryCode, subdivisionCode),
      { livetime: 86400000 } // 24 saat
    );
  }

  @MessagePattern('ubs-platform/cscd/country-details')
  async getCountryDetails(localityInfoRequest: LocalityInfoRequest): Promise<LocalityInfoResponse> {

    return await this.cacheManager.getOrCallAsync(
      'cscd_countrydetails_' + localityInfoRequest.countryCode + '_' + localityInfoRequest.subdivisionCode + "_" + localityInfoRequest.localityCode,
      () => this.cscdService.getCountryDetails(localityInfoRequest),
      { livetime: 86400000 } // 24 saat
    );
  }
}