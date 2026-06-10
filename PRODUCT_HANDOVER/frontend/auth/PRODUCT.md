# Authentication Screens

Login, OAuth callback, and logout flows for the admin panel.

## What Users Can Do

- **Sign in**: Username/password or social providers (Google, Facebook, LinkedIn, GitHub)
- **Custom login layout**: Center, left, or right layout with Content Box slots
- **Complete OAuth**: Handle social auth return and redirect to intended page
- **Sign out**: Clear session and return to login

## Interface Elements

| Screen | Route | Key elements |
|--------|-------|--------------|
| **Login** | `/login` | Username/password fields, social buttons, register link, custom Content Box slots |
| **Auth callback** | `/auth/callback` | Silent token exchange, redirect |
| **Logout** | `/logout` | Session clear, redirect to login |

## User Flow

1. Guest navigates to protected route → redirected to `/login`
2. User enters credentials or clicks social provider
3. On success, redirected to home or original destination
4. Social flow: redirect to provider → callback → session established
5. Logout clears cookie and returns to login

## Related

- [Authentication API](../../api/auth.md)
- [Configurations](../configurations/PRODUCT.md) — auth-configuration controls login behavior
