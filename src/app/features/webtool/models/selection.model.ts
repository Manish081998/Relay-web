export interface SelectionOptionDto {
  id: string;
  label: string;
  value: string;
}

export interface SelectionDto {
  id: string;
  name: string;
  options: SelectionOptionDto[];
}
