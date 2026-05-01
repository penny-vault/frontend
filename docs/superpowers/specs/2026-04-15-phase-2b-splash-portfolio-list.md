# Phase 2b: Splash + Portfolio List — Design Spec

**Date:** 2026-04-15
**Status:** Approved

## Goal

Add the two pages needed for a real login-to-dashboard flow: a full-bleed Splash/login page and a Portfolio List landing page. After this phase, users see Splash → login → Portfolio List → click portfolio → Portfolio Summary.

## Splash Page

- **Layout:** `SplashLayout.vue` — standalone, no top bar or nav.
- **Route:** `/` — public (no auth guard). Auto-redirects to `/portfolios` if already authenticated.
- **Visual:** Full-bleed `wallpaper.png` as `background-image: cover center`. Semi-transparent dark overlay (`rgba(15,20,25,0.55)`). Centered login card with: PV logo (rounded corners, same as top bar), "Penny Vault" heading in Fraunces serif, subtitle, and "Sign in" button calling Auth0's `loginWithRedirect()`.
- **Dark only:** No theme toggle on splash. The overlay ensures readability.
- **Auth detection:** On mount, check `isAuthenticated` from Auth0. If true, redirect to `/portfolios`. In mock mode (`VITE_USE_MOCKS=1`), show "Continue as demo user" button that navigates to `/portfolios` directly (no Auth0 call).
- **Responsive:** Card stays centered on mobile. Photo crops via `cover`.

## Portfolio List Page

- **Layout:** `MainLayout` (top bar, nav, theme toggle).
- **Route:** `/portfolios` — protected (auth guard, bypassed in mock mode).
- **Data:** `usePortfolioList()` composable wrapping `listPortfolios()`. Returns `PortfolioListItem[]` with: id, name, benchmark, inceptionDate, currentValue, ytdReturn, maxDrawDown, lastUpdated.
- **Template:** Page heading ("Portfolios"), grid of portfolio cards. Each card is a `<Panel>` containing: portfolio name (h3), benchmark label, row of 3 mini KPI values (Current Value, YTD Return, Max DD), "last updated" timestamp. Click card → `router.push('/portfolios/' + id)`.
- **Loading:** Skeleton/pulse state while query loads.
- **Empty:** "No portfolios found" message if list is empty.
- **Breadcrumb:** "Portfolios" (no parent crumb needed).

## Routing

| Path | Page | Layout | Auth |
|---|---|---|---|
| `/` | SplashPage | SplashLayout | Public (redirect if authed) |
| `/portfolios` | PortfolioList | MainLayout | Protected |
| `/portfolios/:id` | PortfolioSummary | MainLayout | Protected |
| `/:pathMatch(.*)*` | redirect to `/` | — | — |

Current `/` → PortfolioSummary moves to `/portfolios/:id`.

## New Files

```
src/layouts/SplashLayout.vue        # full-bleed wallpaper + overlay + slot
src/pages/SplashPage.vue            # login card + auth redirect logic
src/pages/PortfolioList.vue         # portfolio grid + data fetching
src/composables/usePortfolioList.ts # Vue Query wrapper for listPortfolios
```

## Modified Files

```
src/router.ts                       # restructure routes: /, /portfolios, /portfolios/:id
src/mocks/fixtures.ts               # may need to add more portfolios to the list fixture
tests/e2e/summary.spec.ts           # update route from / to /portfolios/:id
```

## API / MSW

No new API endpoints. `listPortfolios()` and its MSW handler already exist. The fixture returns one portfolio; optionally add 2-3 more to make the list page look realistic.

## Testing

- **Vitest:** `usePortfolioList` composable test (returns data from MSW).
- **Playwright:** New e2e test: splash page loads → click sign in (mock mode: "Continue as demo user") → portfolio list renders → click portfolio → summary page loads.
- **Existing e2e:** Update the summary spec to navigate to `/portfolios/:id` instead of `/`.

## Success Criteria

1. Splash page renders with wallpaper background and login button
2. In mock mode, "Continue as demo user" navigates to portfolio list
3. Portfolio list shows portfolio cards with name, value, YTD, max DD
4. Clicking a portfolio card navigates to the summary page
5. Existing summary page works at `/portfolios/:id`
6. All existing tests pass (with route updates)
7. `npm run typecheck && npm run build && npm run lint:check && npm run format:check` all pass

## Out of Scope

- Real Auth0 login flow testing (requires credentials)
- Portfolio search/filter on the list page
- Additional portfolio detail pages (Holdings, Transactions, etc.)
- Nav links becoming functional router-links (future phase)
