import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';
import { CACHE_TTL_MS } from '../constants/app.constants';

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiry:   number;
}

const cache = new Map<string, CacheEntry>();

/**
 * In-memory HTTP cache for GET requests.
 * Add header `X-Cache-TTL: <ms>` on the request to set a custom TTL.
 * Add header `X-Skip-Cache: true` to bypass the cache entirely.
 * Default TTL: CACHE_TTL_MS.MEDIUM (2 min).
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') return next(req);

  // Opt-out header
  if (req.headers.has('X-Skip-Cache')) {
    return next(req.clone({ headers: req.headers.delete('X-Skip-Cache') }));
  }

  const key    = req.urlWithParams;
  const cached = cache.get(key);

  if (cached && Date.now() < cached.expiry) {
    return of(cached.response.clone());
  }

  const ttl = Number(req.headers.get('X-Cache-TTL') ?? CACHE_TTL_MS.MEDIUM);
  const cleanReq = req.headers.has('X-Cache-TTL')
    ? req.clone({ headers: req.headers.delete('X-Cache-TTL') })
    : req;

  return next(cleanReq).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        cache.set(key, { response: event.clone(), expiry: Date.now() + ttl });
      }
    }),
  );
};

/** Call to manually invalidate a cached URL (or all if no key given). */
export function invalidateCache(key?: string): void {
  key ? cache.delete(key) : cache.clear();
}
