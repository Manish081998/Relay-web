import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  value = input.required<string>();

  colorClass = computed(() => {
    switch (this.value().toUpperCase()) {
      case 'APPROVED': return 'badge--green';
      case 'REVIEW':   return 'badge--yellow';
      case 'ARCHIVED': return 'badge--gray';
      default:         return 'badge--purple';
    }
  });
}
