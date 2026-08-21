export interface CountryDTO {
  _id: string;
  name?: string;
  code?: string;
  localeCode?: string;
}

export interface SubdivisionDTO {
  _id: string;
  name?: string;
  countryCode: string;
}

export interface LocalityDTO {
  _id: string;
  name?: string;
  subdivisionCode: string;
}