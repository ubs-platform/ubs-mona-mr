import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Country, Locality, Subdivision } from '@ubs-platform/cscd-entity-mongo';
import { CscdWebserviceService } from './cscd-webservice.service';

describe('CscdWebserviceService', () => {
  let service: CscdWebserviceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CscdWebserviceService,
        { provide: getModelToken(Country.name), useValue: {} },
        { provide: getModelToken(Subdivision.name), useValue: {} },
        { provide: getModelToken(Locality.name), useValue: {} },
      ],
    }).compile();

    service = module.get<CscdWebserviceService>(CscdWebserviceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
