---
name: responsive-ui-audit
description: Audit or fix mobile/tablet responsiveness for Logistics MVP+ pages, forms, modals, and tables.
---

# Responsive UI audit

## When to use

- Horizontal overflow, broken modals, or nav issues on tablet/mobile.
- Before demo on smaller screens.

## Goal

Usable layouts at 1440, 1024, 768, 430, 390 px without severe overflow.

## Safety rules

- No full redesign; CSS/layout fixes only.
- Preserve Russian labels and existing components.
- Run `npm run build` after frontend changes.

## Files to read

- `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/Header.tsx`
- `src/pages/Dashboard.tsx`, `Shipments.tsx`, `Tracking.tsx`, `Managers.tsx`, `Clients.tsx`, `Finance.tsx`
- `src/styles/*.css`, `src/hooks/useMediaQuery.ts`

## Viewports to test

| Width | Device class |
|-------|----------------|
| 1440 | Desktop |
| 1024 | Laptop / compact desktop |
| 768 | Tablet |
| 430 | Large phone |
| 390 | iPhone-class |

## Per-page checks

- [ ] Sidebar / mobile menu (`Открыть меню`)
- [ ] Dashboard charts and cards
- [ ] Shipments list + detail panel / modal
- [ ] Forms and modals (create shipment, manager, client)
- [ ] Tables (finance, manager shipments)
- [ ] Tracking map + checkpoint modal

## Validation

```bash
npm run build
```

Browser DevTools device mode or resize window.

## Do not

- Introduce a new CSS framework.
- Break desktop layout while fixing mobile.

## Output format

1. Changed files (if implement)
2. Viewport matrix (page × viewport × PASS/FAIL)
3. Issue list with screenshot refs
4. Build result
5. Commit hash if committed
