import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { InitialsPipe } from '../../shared/pipes/initials.pipe';
import { ENVIRONMENT } from '../../core/tokens/environment.token';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InitialsPipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly auth    = inject(AuthStore);
  readonly user    = this.auth.currentUser;
  readonly envText = inject(ENVIRONMENT).serverModeText;
  readonly envappVersion = inject(ENVIRONMENT).appVersion;
  readonly envappVersionDate = inject(ENVIRONMENT).appVersionDate;

  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly sectionLabels: Record<string, string> = {
    dashboard:  'Dashboard',
    documentum: 'Documentum',
    intranet:   'Intranet',
    webtool:    'WebTool',
    reports:    'Reports',
    admin:      'Administration',
  };

  readonly sectionTitle = computed(() => {
    const segment = (this.currentUrl() ?? '').split('/').filter(Boolean)[0] ?? '';
    return this.sectionLabels[segment] ?? 'Project Relay';
  });
}
