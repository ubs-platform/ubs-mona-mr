export interface CountryDTO {
  _id: string;
  name?: string;
  code?: string;
  localeCode?: string;
}

export interface SubdivisionDTO {
  _id: string;
  name?: string;
  code?: string;
  countryCode: string;
}

export interface LocalityDTO {
  _id: string;
  name?: string;
  code?: string;
  countryCode: string;
  subdivisionCode: string;
}

/**
 * Örnek:
 * 
 * CountryDTO: {
 * name: "Türkiye",
 * code: "TR",
 * localeCode: "tr" 
 * }
 * 
 * SubdivisionDTO: {
 * name: "İstanbul",
 * code: "34",
 * countryCode: "TR"
 * }
 * 
 * 
 * LocalityDTO: {
 * name: "Kadıköy",
 * code: "34-1",
 * subdivisionCode: "34"
 * }
 */