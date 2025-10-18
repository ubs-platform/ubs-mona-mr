export interface GlobalVariableDTO {
  id: string;
  name: string;
  values: Array<{ language: string; value: string }>;
}

export interface GlobalVariableJsonDTO {
  id: string;
  name: string;
  values: { [language: string]: string };
}
