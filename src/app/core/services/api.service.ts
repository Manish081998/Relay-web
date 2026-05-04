import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Options accepted by every request method. */
export interface RequestOptions {
  /** Query-string parameters appended to the URL. */
  params?: Record<string, string | number | boolean>;
  /** Per-request headers merged on top of the interceptor-injected ones. */
  headers?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // ─── Standard JSON verbs ──────────────────────────────────────────────────

  get<T>(url: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(url, this.jsonOptions(options));
  }

  post<T>(url: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(url, body, this.jsonOptions(options));
  }

  put<T>(url: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.put<T>(url, body, this.jsonOptions(options));
  }

  patch<T>(url: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.patch<T>(url, body, this.jsonOptions(options));
  }

  /** DELETE optionally accepts a body (e.g. bulk-delete by ID list). */
  delete<T>(url: string, body?: unknown, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(url, { ...this.jsonOptions(options), body });
  }

  /** HEAD — returns full HttpResponse so callers can inspect headers. */
  head(url: string, options?: RequestOptions): Observable<HttpResponse<void>> {
    return this.http.head<void>(url, {
      ...this.jsonOptions(options),
      observe: 'response',
    });
  }

  // ─── File upload ──────────────────────────────────────────────────────────

  /**
   * Sends a multipart/form-data request.
   * Pass a pre-built FormData — HttpClient sets the boundary automatically.
   * Do NOT set Content-Type manually; the browser must include the boundary.
   *
   * @example
   * const form = new FormData();
   * form.append('file', fileInput.files[0]);
   * form.append('documentId', id);
   * this.api.upload<UploadResultDto>('/api/documents/upload', form);
   */
  upload<T>(url: string, form: FormData, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(url, form, {
      params:  this.buildParams(options?.params),
      headers: options?.headers,
      // No Content-Type header — HttpClient sets multipart/form-data + boundary
    });
  }

  // ─── File download ────────────────────────────────────────────────────────

  /**
   * Downloads a file as a Blob.
   * Caller is responsible for triggering the browser save dialog.
   *
   * @example
   * this.api.download('/api/documents/123/export').subscribe(blob => {
   *   const url = URL.createObjectURL(blob);
   *   const a = document.createElement('a');
   *   a.href = url;
   *   a.download = 'export.pdf';
   *   a.click();
   *   URL.revokeObjectURL(url);
   * });
   */
  download(url: string, options?: RequestOptions): Observable<Blob> {
    return this.http.get(url, {
      ...this.jsonOptions(options),
      responseType: 'blob',
    });
  }

  // ─── Full response (body + headers + status) ──────────────────────────────

  /**
   * Like get<T>() but returns the complete HttpResponse including
   * status code and response headers (e.g. X-Total-Count for pagination).
   *
   * @example
   * this.api.getResponse<UserDto[]>('/api/users').subscribe(res => {
   *   const total = res.headers.get('X-Total-Count');
   *   const users = res.body;
   * });
   */
  getResponse<T>(url: string, options?: RequestOptions): Observable<HttpResponse<T>> {
    return this.http.get<T>(url, {
      ...this.jsonOptions(options),
      observe: 'response',
    });
  }

  postResponse<T>(url: string, body: unknown, options?: RequestOptions): Observable<HttpResponse<T>> {
    return this.http.post<T>(url, body, {
      ...this.jsonOptions(options),
      observe: 'response',
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private jsonOptions(options?: RequestOptions) {
    return {
      params:  this.buildParams(options?.params),
      headers: options?.headers,
    };
  }

  private buildParams(params?: Record<string, string | number | boolean>): HttpParams {
    let p = new HttpParams();
    if (!params) return p;
    for (const [k, v] of Object.entries(params)) {
      p = p.set(k, String(v));
    }
    return p;
  }
}
