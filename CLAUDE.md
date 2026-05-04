# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Folder Structure

```
src/
├── environments/                        # Per-target config (dev / uat / prod)
│   ├── environment.ts
│   ├── environment.uat.ts
│   └── environment.prod.ts
├── styles/
│   └── _theme.scss                      # RelayPreset — Aura base, purple primary #a78bfa
├── styles.scss                          # Global styles + PrimeNG toast overrides
├── index.html
├── main.ts
├── main.server.ts
├── server.ts
└── app/
    ├── app.ts                           # Root component — mounts <p-toast> + <router-outlet>
    ├── app.html
    ├── app.scss
    ├── app.config.ts                    # provideRouter, provideHttpClient, providePrimeNG, MessageService
    ├── app.config.server.ts
    ├── app.routes.ts                    # Top-level route tree
    ├── app.routes.server.ts
    │
    ├── core/                            # Singleton infrastructure — never lazy-loaded
    │   ├── auth/
    │   │   ├── auth.service.ts          # Signal-based user state, JWT parse, loginDev()
    │   │   ├── auth.store.ts            # Auth signal store
    │   │   ├── auth.guard.ts            # Redirects unauthenticated users to /auth/login
    │   │   └── role.guard.ts            # roleGuard([Role.Admin, ...]) factory
    │   ├── interceptors/
    │   │   ├── auth.interceptor.ts      # Attaches Bearer token to every request
    │   │   ├── cache.interceptor.ts     # In-memory GET cache (X-Cache-TTL / X-Skip-Cache)
    │   │   ├── error.interceptor.ts     # 401 logout, 403 redirect, toast for all others
    │   │   └── loading.interceptor.ts   # Drives UiStore ref-counted loading counter
    │   ├── services/
    │   │   ├── api.service.ts           # HttpClient wrapper (get/post/put/patch/delete/upload/download)
    │   │   ├── notification.service.ts  # Delegates to PrimeNG MessageService
    │   │   ├── session.service.ts       # Session lifecycle helpers
    │   │   └── storage.service.ts       # localStorage abstraction
    │   ├── constants/
    │   │   ├── notification-messages.ts # NM.MODULE.ENTITY.ACTION message registry
    │   │   ├── api-endpoints.constants.ts
    │   │   └── app.constants.ts
    │   └── tokens/
    │       └── environment.token.ts     # ENVIRONMENT InjectionToken
    │
    ├── features/                        # Lazy-loaded feature modules
    │   ├── auth/
    │   │   ├── auth.routes.ts
    │   │   └── login/                   # login.component — devLogin() shortcut
    │   ├── dashboard/                   # → /dashboard (all authenticated)
    │   │   └── dashboard.routes.ts
    │   ├── documentum/                  # → /documents (Admin, Manager, User)
    │   │   ├── documentum.routes.ts     # providers: [DocumentsService, AnnotationsService, DocumentsStore]
    │   │   ├── models/                  # document.model.ts, annotation.model.ts
    │   │   ├── services/                # documents.service.ts, annotations.service.ts
    │   │   ├── store/                   # documents.store.ts (signals)
    │   │   └── pages/
    │   │       ├── document-list/
    │   │       ├── document-detail/
    │   │       └── annotation-detail/
    │   ├── intranet/                    # → /users (Admin, Manager)
    │   │   ├── intranet.routes.ts       # providers: [UsersService, UsersStore]
    │   │   ├── models/                  # user-detail.model.ts
    │   │   ├── services/                # users.service.ts
    │   │   ├── store/                   # users.store.ts (signals)
    │   │   └── pages/
    │   │       ├── user-list/
    │   │       └── user-detail/
    │   ├── webtool/                     # → /selections (all authenticated)
    │   │   ├── webtool.routes.ts        # providers: [SelectionsService, SelectionsStore]
    │   │   ├── models/                  # selection.model.ts
    │   │   ├── services/                # selections.service.ts
    │   │   ├── store/                   # selections.store.ts (signals)
    │   │   └── pages/
    │   │       └── selection-detail/
    │   └── admin/                       # → /admin (Admin only)
    │       └── admin.routes.ts
    │
    ├── layout/
    │   ├── shell/                       # Authenticated app chrome (sidebar + router-outlet)
    │   └── sidebar/
    │       ├── sidebar.component.ts
    │       └── nav-config.ts            # Role-aware nav link definitions
    │
    ├── models/                          # Shared app-wide types
    │   ├── role.enum.ts                 # Role.Admin | Manager | User | Viewer
    │   ├── user.model.ts                # AppUser interface
    │   ├── api-response.model.ts        # ApiResponse<T> wrapper shape
    │   └── pagination.model.ts
    │
    ├── shared/
    │   ├── index.ts                     # Barrel export for all shared items below
    │   ├── components/
    │   │   ├── page-header/             # title (required input), optional subtitle
    │   │   ├── loading-spinner/
    │   │   ├── empty-state/             # icon, title (required), optional message
    │   │   ├── status-badge/            # color-coded by status string value
    │   │   ├── data-table/              # generic TableColumn<T> + rowClick output
    │   │   ├── forbidden/               # 403 page
    │   │   └── not-found/               # 404 page
    │   ├── directives/
    │   │   ├── has-role.directive.ts    # *hasRole="[Role.Admin]" structural directive
    │   │   └── click-outside.directive.ts
    │   └── pipes/
    │       ├── initials.pipe.ts
    │       └── truncate.pipe.ts
    │
    └── store/
        └── ui/
            └── ui.store.ts              # Global: sidebarCollapsed, isLoading (ref-counted)
```

---

## Architecture

**Angular 20 · Standalone · Zoneless · SSR**

- No NgModules anywhere. Every component, directive, and pipe is standalone.
- `provideZonelessChangeDetection()` — Zone.js is not loaded. Change detection fires only on signal writes and explicit `markForCheck()`. All feature components use `ChangeDetectionStrategy.OnPush`.
- SSR via Angular Universal + Express (`src/main.server.ts`, `src/server.ts`).

---

## Dependency Injection

**Use `inject()` exclusively — never constructor injection.**

```typescript
private readonly auth = inject(AuthService);
private readonly router = inject(Router);
```

This is the project-wide pattern. All components, services, stores, interceptors, guards, and directives use `inject()`.

---

## State Management

No NgRx. State is managed with Angular signals in two layers:

**Global (`src/app/store/`)** — `UiStore` (`providedIn: 'root'`). Owns sidebar collapse and a reference-counted global loading counter (`startLoading` / `stopLoading` pairs).

**Feature stores** — plain `@Injectable()` classes, **not** `providedIn: 'root'`. They are provided at route level (see Routing section) so they're destroyed on route exit.

Store pattern:
```typescript
@Injectable()
export class FooStore {
  private readonly destroyRef = inject(DestroyRef);

  private readonly _item = signal<FooDto | null>(null);
  private readonly _loading = signal(false);

  readonly item    = this._item.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasData = computed(() => this._item() !== null);

  loadById(id: string): void {
    this._loading.set(true);
    this.svc.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))   // cancels in-flight request on destroy
      .subscribe({
        next: res => { this._item.set(res.data); this._loading.set(false); },
        error: ()  => { this._loading.set(false); this.notify.error(...); },
      });
  }
}
```

Use `subscribe()` + `takeUntilDestroyed` in stores (cancellable). Use `firstValueFrom()` + async/await only in component methods where cancellation is not needed.

---

## Routing

Three-layer structure defined in `src/app/app.routes.ts`:

1. **Public** — `auth/**` (no guards)
2. **Authenticated shell** — `''` path, `canActivate: [authGuard]`, loads `ShellComponent`; all feature routes are children
3. **404** wildcard → `NotFoundComponent`

Route protection uses a `roleGuard` factory:
```typescript
canActivate: [roleGuard([Role.Admin, Role.Manager])]
```

**Feature services and stores are provided at route level**, not root:
```typescript
{
  path: '',
  providers: [DocumentsService, AnnotationsService, DocumentsStore],
  children: [ ... ]
}
```
This scopes them to the route lifetime and avoids memory leaks.

Route params bind directly to component inputs via `withComponentInputBinding()` — use `input.required<string>()` in the component, no `ActivatedRoute` needed.

---

## HTTP Layer

**`ApiService`** (`src/app/core/services/api.service.ts`) — thin wrapper around `HttpClient`. All methods accept an optional `RequestOptions` (`params`, `headers`).

| Method | Use for |
|--------|---------|
| `get / post / put / patch / delete` | Standard JSON requests |
| `upload(url, FormData)` | Multipart file upload — never set Content-Type manually |
| `download(url)` | Returns `Observable<Blob>` |
| `getResponse / postResponse` | Full `HttpResponse<T>` (access status + headers) |
| `head(url)` | Returns `HttpResponse<void>` |

**Interceptor chain** (order matters): `authInterceptor` → `cacheInterceptor` → `errorInterceptor` → `loadingInterceptor`

- **auth**: Reads JWT from `StorageService`, adds `Authorization: Bearer <token>` header
- **cache**: In-memory GET cache. Custom TTL via `X-Cache-TTL: <ms>` request header. Bypass with `X-Skip-Cache: true`. Call `invalidateCache(url?)` to evict programmatically.
- **error**: 401 → `auth.logout()` + session-expired toast; 403 → navigate to `/forbidden`; all others → `httpMessage(status)` toast
- **loading**: Drives `UiStore` ref-counted loading counter (`startLoading` / `stopLoading`)

---

## Notifications

All user-facing messages live in `src/app/core/constants/notification-messages.ts` as `NOTIFICATION_MESSAGES` (import alias `NM`). Organised by module:

```typescript
NM.AUTH.LOGIN_FAILED
NM.DOCUMENTUM.DOCUMENT.LOAD_FAILED
NM.INTRANET.USER.UPDATE_SUCCESS
NM.WEBSELECT.SELECTION.NOT_FOUND
NM.GENERAL.UNEXPECTED
NM.HTTP[404]          // ← numeric keys require bracket notation
```

Show notifications via `NotificationService` (delegates to PrimeNG `MessageService`):
```typescript
this.notify.success(NM.INTRANET.USER.UPDATE_SUCCESS, 'Intranet');
this.notify.error(NM.DOCUMENTUM.DOCUMENT.LOAD_FAILED, 'Documentum');
```

`<p-toast>` is mounted once in the root `AppComponent`. `MessageService` is provided at root in `appConfig`.

---

## Auth

`AuthService` holds the current user in a signal, rehydrated from `localStorage` on init. Two login paths:

- `loginDev(AppUser)` — development shortcut, persists user object to `localStorage` (no token needed)
- `login(jwtToken)` — real auth (not yet connected); parses JWT payload shape `{ sub, email, name, roles[] }`

Guards read `AuthService.isAuthenticated` and `AuthService.hasAnyRole(roles)`.

---

## Feature Modules (API-mapped)

Three features map 1:1 to the .NET API modules:

| Route | Feature folder | API module | Roles |
|-------|---------------|------------|-------|
| `/documents` | `features/documentum` | Documentum | Admin, Manager, User |
| `/users` | `features/intranet` | Intranet | Admin, Manager |
| `/selections` | `features/webtool` | WebTool | all authenticated |

Each feature has: `models/`, `services/`, `store/`, `pages/`, `{feature}.routes.ts`.

API base URL is per-environment in `src/environments/`. Endpoint paths are in `src/app/core/constants/api-endpoints.constants.ts`.

---

## Shared

`src/app/shared/index.ts` barrel-exports all reusable pieces:

- **Components**: `PageHeaderComponent`, `LoadingSpinnerComponent`, `EmptyStateComponent`, `StatusBadgeComponent`, `DataTableComponent`
- **Directives**: `HasRoleDirective` (`*hasRole="[Role.Admin]"`), `ClickOutsideDirective`
- **Pipes**: `TruncatePipe`, `InitialsPipe`

---

## Theme

PrimeNG v21 with custom `RelayPreset` (Aura base, purple primary palette `#a78bfa`). Dark mode is always on — `darkModeSelector: 'html'` in `providePrimeNG`. Toast overrides in `src/styles.scss` use frosted-glass styling to match the dark background (`#07070f`).

---

## MCP Tools: code-review-graph

**Always use code-review-graph MCP tools before Grep/Glob/Read for codebase exploration.** The graph is faster and gives structural context (callers, dependents) that file scanning cannot.

| Tool | Use when |
|------|----------|
| `semantic_search_nodes` | Finding functions/classes by name or concept |
| `query_graph` | Tracing callers, callees, imports, tests |
| `get_impact_radius` | Understanding blast radius before changing a shared file |
| `detect_changes` | Risk-scored analysis of current branch changes |
| `get_review_context` | Source snippets for code review |
| `get_architecture_overview` | High-level structure |

Fall back to Grep/Glob/Read only when the graph doesn't cover what you need.
