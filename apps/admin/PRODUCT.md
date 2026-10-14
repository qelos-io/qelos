# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Admins and developers of a Qelos-powered application (the admin panel is the control surface of an AI-first application gateway). Two modes of use: (1) frequent, short visits to investigate what happened (failed AI calls, payment/webhook errors, token usage, audits); (2) rare, one-time setup tasks (connect a storage provider, finish first-run setup) where confidence that it works matters most.

## Product Purpose
Qelos is an AI-first application layer gateway: admin panel, API gateway and plugin for any framework. The admin app lets people manage data models, AI agents, users, workspaces, permissions, events and storage. Success: an admin answers "what went wrong, for whom, when?" in seconds, and a developer finishes setup without doubting it works.

## Capabilities and Constraints
- Vue 3 (Composition API), Pinia, Element Plus, vue-i18n (en/es/fr/he, RTL supported); keep `dir="ltr"` for code-like values.
- Multi-tenant; admin-only routes use `meta.roles: ['admin']`.
- Existing shell (sidebar, header, theme palette variables) stays; redesign is per-page layout, information structure and interaction.
- Pages in scope: Events Log (`modules/admins`), Storage list/add/edit (`modules/assets`), Quick Start wizard.
- Events data: kind, eventName, source, user, workspace, metadata (arbitrary JSON), created; server-side pagination with capped totals; filters kind/eventName/source/user/workspace/search/period.
- Storage kinds: s3, gcs, cloudinary, ftp; per-kind credentials; no connection-test endpoint exists yet (would need a backend addition).

## Product Principles
1. Answer the user's question before showing the data model: lead with the answer (what failed, is it connected), then the raw detail.
2. Everything is addressable: filters, selected event and steps live in the URL.
3. Mobile and RTL are first-class, not afterthoughts.
4. Secrets and destructive actions are explicit, never ambiguous.

## Accessibility & Inclusion
Keyboard operable, visible focus, WCAG AA contrast, reduced-motion respected, four locales including RTL Hebrew.
