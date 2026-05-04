import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type StorageType = 'session' | 'local';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get(key: string, type: StorageType = 'session'): string | null {
    if (!this.isBrowser) return null;
    return this.store(type).getItem(key);
  }

  set(key: string, value: string, type: StorageType = 'session'): void {
    if (!this.isBrowser) return;
    this.store(type).setItem(key, value);
  }

  remove(key: string, type: StorageType = 'session'): void {
    if (!this.isBrowser) return;
    this.store(type).removeItem(key);
  }

  clear(type: StorageType = 'session'): void {
    if (!this.isBrowser) return;
    this.store(type).clear();
  }

  private store(type: StorageType): Storage {
    return type === 'local' ? localStorage : sessionStorage;
  }
}
