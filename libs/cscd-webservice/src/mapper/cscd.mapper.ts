import { Country, Locality, Subdivision } from '@ubs-platform/cscd-entity-mongo';
import {
  CountryDTO,
  LocalityDTO,
  SubdivisionDTO,
} from '@ubs-platform/cscd-common';

export class CscdMapper {
  static countryToDto(country: Country): CountryDTO {
    return {
      _id: country._id!.toString(),
      name: country.name,
      code: country.code,
      localeCode: country.localeCode,
      hasSubdivisions: country.hasSubdivisions,
    };
  }

  static subdivisionToDto(subdivision: Subdivision): SubdivisionDTO {
    return {
      _id: subdivision._id!.toString(),
      name: subdivision.name,
      code: subdivision.code,
      countryCode: subdivision.countryCode || '',
    };
  }

  static localityToDto(locality: Locality): LocalityDTO {
    return {
      _id: locality._id!.toString(),
      name: locality.name,
      code: locality.code,
      countryCode: locality.countryCode || '',
      subdivisionCode: locality.subdivisionCode || '',
    };
  }
}