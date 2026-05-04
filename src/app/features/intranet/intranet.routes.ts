import { Routes } from '@angular/router';
import { UsersService } from './services/users.service';
import { UsersStore } from './store/users.store';

export const intranetRoutes: Routes = [
  {
    path: '',
    providers: [UsersService, UsersStore],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/user-list/user-list.component').then(m => m.UserListComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./pages/user-detail/user-detail.component').then(m => m.UserDetailComponent),
      },
    ],
  },
];
