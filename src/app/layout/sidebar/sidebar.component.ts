import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { UiStore } from '../../store/ui/ui.store';
import { InitialsPipe } from '../../shared/pipes/initials.pipe';
import { ADMIN_NAV, DASHBOARD_NAV, NAV_GROUPS, NavGroup, NavStandaloneItem } from './nav-config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, InitialsPipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly auth      = inject(AuthStore);
  readonly ui        = inject(UiStore);
  readonly user      = this.auth.currentUser;
  readonly collapsed = this.ui.sidebarCollapsed;
  private readonly router = inject(Router);

  readonly dashboard = DASHBOARD_NAV;
  readonly allGroups = NAV_GROUPS;
  readonly allAdmin  = ADMIN_NAV;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly _manualToggles = signal<Map<string, boolean>>(new Map());

  readonly openGroupLabels = computed(() => {
    const url    = this.currentUrl() ?? '';
    const manual = this._manualToggles();
    return new Set(
      NAV_GROUPS
        .filter(g => {
          const override = manual.get(g.label);
          return override !== undefined
            ? override
            : g.children.some(c => url.startsWith(c.route));
        })
        .map(g => g.label),
    );
  });

  readonly visibleGroups = computed<NavGroup[]>(() =>
    this.allGroups.filter(g =>
      g.roles === 'all' || this.auth.hasAnyRole(g.roles),
    ),
  );

  readonly visibleAdmin = computed<NavStandaloneItem[]>(() =>
    this.allAdmin.filter(i =>
      i.roles === 'all' || this.auth.hasAnyRole(i.roles),
    ),
  );

  toggle(groupLabel: string): void {
    // When collapsed: clicking a group icon navigates directly to its first child
    if (this.collapsed()) {
      const group = NAV_GROUPS.find(g => g.label === groupLabel);
      if (group?.children.length) {
        this.router.navigate([group.children[0].route]);
      }
      return;
    }
    const isOpen = this.openGroupLabels().has(groupLabel);
    this._manualToggles.update(m => new Map(m).set(groupLabel, !isOpen));
  }
}
