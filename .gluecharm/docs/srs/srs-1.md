# SRS-1: Vercel Web Analytics Integration

**Document ID:** SRS-1  
**Title:** Install and configure Vercel Web Analytics in penpot-wizard  
**Version:** 0.1 (draft)  
**Status:** For review  
**Last updated:** 2025-02-26  

---

## 1. Purpose

Define the requirements to integrate [Vercel Web Analytics](https://vercel.com/docs/analytics) into the penpot-wizard project (React + Vite SPA) so that production deployments can collect privacy-friendly, anonymized usage metrics (e.g. page views) when the application is hosted on Vercel.

---

## 2. Scope

### 2.1 In scope

- Adding the official `@vercel/analytics` package to the project.
- Mounting the Analytics component so that page views and (if applicable) custom events are tracked in production.
- Ensuring analytics run only in production (or when explicitly enabled), not in local development, to avoid polluting data and respecting developer privacy.
- Documenting any required Vercel Dashboard configuration (e.g. enabling Web Analytics for the project).
- Ensuring that when the application is deployed in a **non-Vercel environment**, it SHALL still work fully (all features, UI, navigation, Penpot connection, etc.); analytics will not be available in that case, but no other functionality SHALL be affected.

### 2.2 Out of scope

- Backend or server-side analytics.
- Non-Vercel analytics providers (e.g. Google Analytics, Plausible).
- Detailed event schema design or product analytics (beyond basic page views and any minimal custom events needed for the integration).
- Cookie consent or GDPR-specific implementation (Vercel Web Analytics is cookie-free and privacy-focused; consent flows are out of scope for this SRS).

---

## 3. Definitions and references

| Term | Definition |
|------|------------|
| **Vercel Web Analytics** | Vercel’s built-in, cookie-free analytics product that provides page views and optional custom events. |
| **@vercel/analytics** | Official npm package that provides the client-side integration (e.g. `<Analytics />` for React). |
| **Production** | Environment where the app is built and run with `NODE_ENV=production` (e.g. Vercel deployment). |
| **SPA** | Single-page application; the app is a React + Vite SPA. |

**References**

- [Vercel Web Analytics – Overview](https://vercel.com/docs/analytics)
- [@vercel/analytics – Package docs](https://vercel.com/docs/analytics/package)
- [@vercel/analytics (npm)](https://www.npmjs.com/package/@vercel/analytics)

---

## 4. Stakeholders and users

- **Developers:** Need a simple, maintainable integration and clear docs.
- **Project owner / DevOps:** Need to enable and optionally configure analytics in the Vercel project.
- **End users:** Affected only indirectly (anonymized data collection); no direct interaction with the feature.

---

## 5. Functional requirements

### FR-1: Package dependency

- **FR-1.1** The project SHALL include the dependency `@vercel/analytics` (suitable version for the current React and Vite setup).
- **FR-1.2** The dependency SHALL be added as a production dependency (e.g. in `dependencies` in `package.json`), not only as a dev dependency.

### FR-2: Client-side integration

- **FR-2.1** The application SHALL use the React integration from `@vercel/analytics/react` (e.g. the `<Analytics />` component).
- **FR-2.2** The Analytics component SHALL be rendered once at the application root (e.g. in the root component rendered from `src/main.jsx`, such as `App.jsx` or the tree rooted there), so that it is active for the entire SPA.
- **FR-2.3** The integration SHALL be implemented in a way that does not break existing functionality (no required change to routing or core app behavior beyond adding the component).

### FR-3: Environment behavior

- **FR-3.1** Analytics SHALL be disabled in development (e.g. when running `npm run dev` or when `NODE_ENV` is not production), so that local usage is not reported.
- **FR-3.2** Analytics SHALL be active in production when the app is deployed to Vercel and Web Analytics is enabled for the project in the Vercel Dashboard.
- **FR-3.3** If the project is deployed outside Vercel (non-Vercel environment), analytics SHALL not run (no data sent; integration behaves as a no-op). The application SHALL otherwise function fully: all features, UI, navigation, Penpot connection, and build/runtime behavior SHALL work as when deployed on Vercel, with only analytics disabled. The primary supported deployment target for analytics is Vercel; the application itself SHALL remain deployable and fully functional on any host.

### FR-4: Vercel project configuration

- **FR-4.1** The SRS and/or implementation docs SHALL state that Web Analytics MUST be enabled for the Vercel project (e.g. under Project → Settings → Analytics or the Analytics tab) for data to appear.
- **FR-4.2** No application code SHALL be required to “log in” or pass Vercel project credentials; the official package associates data with the project via the deployment environment.

---

## 6. Non-functional requirements

### NFR-1: Performance

- **NFR-1.1** The analytics script SHALL be loaded in a non-blocking way so that it does not delay initial render or critical user interactions.
- **NFR-1.2** The chosen integration (e.g. default behavior of `@vercel/analytics`) SHALL be acceptable for a typical SPA; no extra heavy scripts are introduced beyond the official package.

### NFR-2: Privacy and compliance

- **NFR-2.1** The solution SHALL rely on Vercel’s cookie-free, anonymized Web Analytics model; no cookies SHALL be required for basic page view tracking.
- **NFR-2.2** No PII SHALL be sent in the implementation by default; any future custom events SHALL be specified and reviewed separately.

### NFR-3: Maintainability

- **NFR-3.1** The integration point (e.g. where `<Analytics />` is mounted) SHALL be clearly identifiable in the codebase (single, documented location).
- **NFR-3.2** Upgrades of `@vercel/analytics` SHALL follow the project’s dependency update policy; no custom patches to the package are in scope.

---

## 7. Acceptance criteria

Acceptance criteria will be marked as **Validated** or **Not validated** after testing (to be updated in a later step).

| ID | Criterion | Status |
|----|-----------|--------|
| **AC-1** | `@vercel/analytics` is listed in `package.json` (production dependency) and installs without error (`npm install`). | Pending |
| **AC-2** | The React Analytics component is imported from `@vercel/analytics/react` and rendered at the app root. | Pending |
| **AC-3** | Running `npm run dev` and navigating the app does not send analytics events (or no production events appear in the Vercel Analytics dashboard for that traffic). | Pending |
| **AC-4** | After enabling Web Analytics for the project in the Vercel Dashboard and deploying to Vercel, page views for the deployed URL are visible in the Vercel Analytics dashboard. | Pending |
| **AC-5** | Build succeeds: `npm run build` completes without errors and the Analytics-related code does not cause build-time or runtime errors in production build. | Pending |
| **AC-6** | No regression: existing app behavior (e.g. Penpot connection, UI, navigation) works as before. | Pending |
| **AC-7** | Non-Vercel environment: when the app is built and run outside Vercel (e.g. `npm run build` + `npm run preview`, or static hosting elsewhere), the application runs without errors, all features work (UI, navigation, Penpot connection), and no analytics are sent; only analytics are disabled, nothing else is broken. | Pending |

---

## 8. Assumptions and dependencies

- The application is or will be deployable on Vercel and on other hosts; analytics are intended for Vercel only. On non-Vercel environments, no analytics are collected but the application SHALL work in full (all features, no degradation).
- The Vercel project has (or will have) access to the Web Analytics feature (subject to Vercel plan).
- The project uses React 19 and Vite 7; the chosen version of `@vercel/analytics` is compatible with this stack.
- No custom domain or multi-environment specifics are required for the initial integration; default behavior is sufficient unless otherwise stated.

---

## 9. Risks and open points

- **Open:** Whether to support optional custom events (e.g. `track()`) in this SRS or in a follow-up. This SRS focuses on installation and page views only.
- **Requirement (non-Vercel):** If the app is deployed to a non-Vercel host, analytics SHALL be a no-op (no analytics), and the rest of the application SHALL work without regression; this behavior SHALL be documented and verified.

---

## 10. Document history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-02-26 | — | Initial draft for review |

---

**Next steps (per project process):**

1. **Review:** Stakeholder validates this SRS (e.g. scope, AC, NFRs).
2. **Plan:** Create PLAN-SRS-1 (implementation plan).
3. **Implement:** Code the plan (dependency, component placement, docs).
4. **Test:** Run acceptance criteria and update status in this document.
5. **Document:** Create USER-MANUAL-SRS-1 if needed for operators/developers.
6. **Handover:** Indicate completion to the user.
