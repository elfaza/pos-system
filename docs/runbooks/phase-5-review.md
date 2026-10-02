# Phase 5 Review: Tenant User Experience

**Branch:** `feature/multi-tenant-organizations-outlets`  
**Scope:** Plan Tasks 16–17  
**Status:** Implementation complete; awaiting review before Phase 6. Desktop/mobile browser review is pending workspace preview access.

## Task 16 — Outlet selection and switching

The root layout now supplies the session's server-resolved tenant membership options to the client shell. A user with one active outlet sees no picker. A user with several outlets gets a required first-login choice and a compact switcher across the app. The switcher is available on POS, kitchen, queue, customer display, and admin screens.

```tsx
if (user && tenantResolution.status === "outlet_required") {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <h1>Choose an outlet</h1>
        <OutletSwitcher selectionRequired />
      </div>
    </main>
  );
}
```

Selecting an outlet sends its ID to the existing session endpoint. The server resolves membership access again, updates the session, clears the POS cart, then the browser navigates to the effective role's landing route. The full navigation clears in-memory UI state. This app has no mounted React Query provider.

```ts
const context = await switchCurrentOutlet(payload.outletId.trim());
return jsonOk({
  activeOrganizationId: context.organizationId,
  activeOutletId: context.outletId,
  role: context.role,
});
```

The browser's outlet IDs are selection values only. Server authorization comes from the authenticated session and is rechecked for every switch.

## Task 17 — Organization, outlet, and team administration

- `/dashboard/organization` shows the profile to owners and outlet admins. Owners can edit its name and slug; admins have read-only access.
- `/dashboard/outlets` lets owners create, edit, activate, and deactivate outlets. Outlet admins see only their current outlet and can edit its name and time zone.
- `/dashboard/team` reuses the Phase 4 membership management service and lists memberships for the active outlet. Owners and outlet admins can manage that outlet's team.
- `/api/organizations/current`, `/api/outlets`, and `/api/outlets/[id]` derive organization scope from the tenant context. Outlet admins are limited to their current outlet.
- New outlets receive their own settings row and time zone. An organization must retain at least one active outlet.
- Screens include loading, empty, validation, duplicate-value conflict, and inactive outlet states.

The outlet list query narrows an admin to the active outlet from the trusted server context:

```ts
where: {
  organizationId: tenant.organizationId,
  ...(tenant.role === "owner" ? {} : { id: tenant.outletId }),
}
```

## Verification

- `npm test`: 48 files passed, 5 skipped; 238 tests passed, 10 skipped.
- `npm run lint`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed, including TypeScript checks and static page generation.
- Added tests cover outlet picker visibility and server-resolved options, session-switch validation, organization profile authorization, and owner/admin outlet endpoint access. Existing Phase 4 membership tests cover team actions.
- Desktop/mobile browser verification remains pending. The managed workspace has no Agent Browser CLI, and its active outbound policy still excludes `localtunnel.me`, so the app cannot be opened through a public preview from this workspace.

## Review limits and follow-up

- Outlet admins can edit their current outlet's name and time zone. Owner-only controls cover organization profile changes and outlet creation, slug changes, and activation state.
- Outlet removal is represented by deactivation; outlet rows are retained for historical records.
- The workspace preview limitation affects visual review only. The production build and automated feature suite pass.
- Phase 6 has not started.

## Commit sequence

- `feat: add outlet switching experience`
- `feat: add organization and outlet administration`
- `docs: add phase 5 review`

Review this document and code before continuing to Phase 6.
