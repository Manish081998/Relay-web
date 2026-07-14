# Contributing to Project Relay — Web

---

> **Why does this file exist?**
>
> Project Relay uses a strict role-based access control (RBAC) pattern.
> Adding a new route requires touching **multiple files in a specific order**.
> Missing even one step can introduce a **silent security bug** — for example,
> hiding a nav link from a User but still allowing them to access the route
> directly via the browser URL bar.
>
> This file is a **pre-flight checklist**. It exists so that any developer —
> whether joining today or returning after months away — follows the same
> safe, consistent process before raising a pull request.
>
> **Read this file before making any changes to routes, roles, or guards.**

---

## Table of Contents

| Section | What it covers |
| :--- | :--- |
| [Branch Naming](#branch-naming) | How to name your branch before starting work |
| [Commit Message Format](#commit-message-format) | How to write consistent commit messages |
| [Adding a New Route](#adding-a-new-route) | The mandatory checklist for every new page/route |
| [Adding a New Role](#adding-a-new-role) | Steps to introduce a new role to the system |
| [Pull Request Checklist](#pull-request-checklist) | What to verify before raising a PR |
| [Code Review Rules](#code-review-rules) | Who reviews what and merge rules |

---

## Branch Naming

| Type | Pattern | Example |
| :--- | :--- | :--- |
| New feature | `feature/<short-description>` | `feature/payroll-dashboard` |
| Bug fix | `fix/<short-description>` | `fix/admin-guard-redirect` |
| Chore / config | `chore/<short-description>` | `chore/update-env-urls` |
| Documentation | `docs/<short-description>` | `docs/contributing-guide` |

> Always branch off `main`. Never commit directly to `main` or `master`.

---

## Commit Message Format

Follow this structure for every commit:

```
<type>: <short summary in present tense>
```

| Type | When to use |
| :--- | :--- |
| `feat` | Adding a new feature or page |
| `fix` | Fixing a bug |
| `chore` | Config changes, dependency updates, tooling |
| `docs` | Documentation only changes |
| `refactor` | Code change that is not a fix or feature |
| `test` | Adding or updating tests |
| `style` | Formatting, missing semicolons — no logic change |

**Examples**

```bash
feat: add payroll route with manager role guard
fix: redirect to forbidden on expired token
chore: update UAT api base url
docs: add new route checklist to contributing guide
```

---

## Adding a New Route

> **This is the most critical checklist in this file.**
> Every step is mandatory. Skipping any step can introduce a security vulnerability.

### Step-by-step checklist

| Step | File to change | What to do |
| :---: | :--- | :--- |
| 1 | `src/app/features/` | Create a new feature folder with `<name>.component.ts` and `<name>.routes.ts` |
| 2 | `src/app/app.routes.ts` | Register the route under the shell, add `authGuard` and `roleGuard([...])` |
| 3 | `src/app/layout/sidebar/nav-config.ts` | Add a `NavItem` entry with the **same roles** as the route guard |
| 4 | `src/environments/environment*.ts` | No change needed unless the route depends on a feature flag |
| 5 | `src/app/app.spec.ts` / feature spec | Add or update tests to cover the new route |

### Role assignment rules

| Who can access | Guard to use | Nav item roles |
| :--- | :--- | :--- |
| All authenticated users | `authGuard` only | `roles: 'all'` |
| Admin + Manager | `roleGuard([Role.Admin, Role.Manager])` | `roles: [Role.Admin, Role.Manager]` |
| Admin only | `roleGuard([Role.Admin])` | `roles: [Role.Admin]` |

> **The roles in `app.routes.ts` and `nav-config.ts` must always match.**
> A mismatch means the UI hides a link but the route remains accessible — a security gap.

### Quick sanity check before committing

| Check | Expected result |
| :--- | :--- |
| Login as a User and navigate to the new route URL directly | Should redirect to `/forbidden` |
| Login as the intended role and navigate to the new route URL directly | Should load the page |
| Login as the intended role and check the sidebar | Nav item should be visible |
| Login as a restricted role and check the sidebar | Nav item should be hidden |

---

## Adding a New Role

| Step | File to change | What to do |
| :---: | :--- | :--- |
| 1 | `src/app/models/role.enum.ts` | Add the new role value to the `Role` enum |
| 2 | `src/app/core/auth/auth.service.ts` | Verify `hasRole()` and `hasAnyRole()` work without changes (they use the enum) |
| 3 | `src/app/layout/sidebar/nav-config.ts` | Add the new role to any `NavItem` it should be able to see |
| 4 | `src/app/app.routes.ts` | Add the new role to any `roleGuard([...])` it should be able to access |
| 5 | `src/app/features/auth/login/login.component.ts` | Add a dev quick-login button for the new role (dev/testing only) |

> After adding a new role, re-run the **Quick sanity check** above for every existing route to confirm no unintended access was granted.

---

## Pull Request Checklist

Complete every item before raising a PR. Unchecked PRs will be sent back.

| # | Check |
| :---: | :--- |
| 1 | Branch is named correctly and branched off `main` |
| 2 | Commit messages follow the format above |
| 3 | `npm test` passes with no failures |
| 4 | `npm run build:uat` completes with no errors |
| 5 | New route has both `authGuard` and `roleGuard` applied (if role-restricted) |
| 6 | Roles in `app.routes.ts` and `nav-config.ts` match exactly |
| 7 | Tested manually by logging in as each affected role |
| 8 | No `console.log` or debug code left in the files |
| 9 | No hardcoded API URLs — all URLs go through `environment.apiBaseUrl` |
| 10 | PR description explains **what** changed and **why** |

---

## Code Review Rules

| Rule | Detail |
| :--- | :--- |
| **Minimum approvals** | At least 1 approval required before merging |
| **No self-merge** | You cannot approve and merge your own PR |
| **Guard changes** | Any change to `auth.guard.ts`, `role.guard.ts`, or `app.routes.ts` requires senior review |
| **Merge strategy** | Squash and merge — keeps `main` history clean |
| **Stale PRs** | PRs open for more than 7 days without activity will be closed |

---

> **Remember** — this checklist exists because RBAC bugs are silent.
> The app will not crash. Tests may still pass. But a user with the wrong role
> will be able to access data they should never see.
> The checklist is the last line of defence before code reaches UAT or production.
