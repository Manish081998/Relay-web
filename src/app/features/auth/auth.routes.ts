import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    title: 'Sign In',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
