import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-selection-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selection-detail.component.html',
  styleUrl: './selection-detail.component.scss',
})
export class SelectionDetailComponent {}
