import { InjectionToken } from '@angular/core';

export interface AppEnvironment {
  appVersion: string;
  appVersionDate: string;
  production: boolean;
  uat: boolean;
  apiBaseUrl: string;
  appName: string;
  serverModeText: string;
}

export const ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');
