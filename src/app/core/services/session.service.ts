import { inject, Injectable } from '@angular/core';
import { AppUser } from '../../models/user.model';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../constants/app.constants';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly storage = inject(StorageService);

  // ── Token ──────────────────────────────────────────────────────────────────

  saveToken(token: string): void {
    this.storage.set(STORAGE_KEYS.TOKEN, token, 'local');
  }

  getToken(): string | null {
    return this.storage.get(STORAGE_KEYS.TOKEN, 'local');
  }

  clearToken(): void {
    this.storage.remove(STORAGE_KEYS.TOKEN, 'local');
  }

  // ── Dev user (development shortcut only) ───────────────────────────────────

  saveDevUser(user: AppUser): void {
    this.storage.set(STORAGE_KEYS.DEV_USER, JSON.stringify(user));
  }

  getDevUser(): AppUser | null {
    const raw = this.storage.get(STORAGE_KEYS.DEV_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppUser;
    } catch {
      return null;
    }
  }

  clearDevUser(): void {
    this.storage.remove(STORAGE_KEYS.DEV_USER);
  }

  // ── Full session lifecycle ─────────────────────────────────────────────────

  clearAll(): void {
    this.clearToken();
    this.clearDevUser();
  }
}
