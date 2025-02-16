export interface GlobalVariableDTO {
  id: string;
  name: string;
  values: Array<{ language: string; value: string }>;
}
