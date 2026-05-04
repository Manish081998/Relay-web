import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../services/api.service';
import { ENVIRONMENT } from '../tokens/environment.token';
import { API_ENDPOINTS } from '../constants/api-endpoints.constants';

export interface LoginRequest {
  UserName: string;
  Password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly env = inject(ENVIRONMENT);

  login(username: string, password: string): Observable<LoginResponse> {
    const url = `${this.env.apiBaseUrl}${API_ENDPOINTS.AUTH.LOGIN}`;
    return this.api.post<LoginResponse>(url, { UserName: username, Password: password } satisfies LoginRequest);
  }

  logout(): Observable<void> {
    const url = `${this.env.apiBaseUrl}${API_ENDPOINTS.AUTH.LOGOUT}`;
    return this.api.post<void>(url, {});
  }
}
