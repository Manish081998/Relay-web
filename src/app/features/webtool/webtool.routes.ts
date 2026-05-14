import { Routes } from '@angular/router';
import { SelectionsService } from './services/selections.service';
import { SelectionsStore } from './store/selections.store';

export const webtoolRoutes: Routes = [
  {
    path: '',
    providers: [SelectionsService, SelectionsStore],
    children: [
      { path: '', redirectTo: 'selections', pathMatch: 'full' },
      {
        path: 'selections/:id',
        title: 'Selection',
        loadComponent: () =>
          import('./pages/selection-detail/selection-detail.component').then(
            m => m.SelectionDetailComponent,
          ),
      },
    ],
  },
];
