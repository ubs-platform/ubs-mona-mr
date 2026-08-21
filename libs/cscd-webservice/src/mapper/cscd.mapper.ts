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
    };
  }

  static subdivisionToDto(subdivision: Subdivision): SubdivisionDTO {
    return {
      _id: subdivision._id!.toString(),
      name: subdivision.name,
      countryId: this.referenceId(subdivision.country),
    };
  }

  static localityToDto(locality: Locality): LocalityDTO {
    return {
      _id: locality._id!.toString(),
      name: locality.name,
      subdivisionId: this.referenceId(locality.subdivision),
    };
  }

  private static referenceId(reference?: { _id?: string } | string): string {
    if (!reference) {
      return '';
    }

    return typeof reference === 'string'
      ? reference
      : reference._id?.toString() || reference.toString();
  }
}