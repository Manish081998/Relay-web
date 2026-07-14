import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends Record<string, unknown>> {
  columns = input.required<TableColumn<T>[]>();
  rows    = input.required<T[]>();
  trackBy = input<keyof T & string>('id');

  rowClick = output<T>();

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  cellValue(row: T, key: string): unknown {
    return row[key];
  }
}
