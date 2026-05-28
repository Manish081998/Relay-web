import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast
      position="top-right"
      [life]="5000"
      [breakpoints]="{ '640px': { width: '100%', right: '0', left: '0' } }"
      styleClass="relay-toast"
    />
    <router-outlet />
  `,
})
export class App {}
