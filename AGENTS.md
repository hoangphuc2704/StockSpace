# FE AGENT RULES

This repository contains the StockSpace frontend only.
Do not modify or inspect StockSpace_BE unless the user explicitly requests it.

## Scope

- Work only inside the StockSpace frontend repository.
- Do not change backend code, database files, Docker services, nginx configuration, or backend deployment files.
- Do not modify `.env` files or expose secrets, tokens, credentials, or private API data.
- Treat existing uncommitted changes as user-owned: inspect `git status` first and preserve unrelated work.
- Put every new Markdown documentation file created by the agent in `docs/`.
- Keep only required repository-level Markdown files at the root, such as `AGENTS.md` and `README.md`.

## Frontend architecture

- Reuse existing components in `src/components` before creating a new shared component.
- Keep feature-specific pages and components inside their matching `src/features/<feature>` directory.
- Keep API calls inside `src/services`; do not duplicate request logic inside page components.
- Follow the existing React, Redux, React Router, Tailwind CSS, and Vite conventions.
- Avoid adding dependencies unless the user explicitly asks for them or the existing stack cannot solve the requirement.

## UI and responsive rules

- Every UI change must work on mobile, tablet, and desktop screens.
- Use the existing responsive breakpoints and mobile-first Tailwind classes.
- Prevent horizontal page overflow. Use `min-w-0` on flex children and keep wide tables inside an `overflow-x-auto` container.
- Reuse shared header, sidebar, modal, table, button, and form components when they already provide the required behavior.
- Do not fix a responsive issue by hiding important data or removing an existing user action.
- Preserve keyboard accessibility, visible focus states, labels, and meaningful `aria-*` attributes.

## StockSpace visual direction

- Keep the product practical and information-dense: dashboards, inventory tables, filters, forms, warehouse layouts, and approval workflows must remain easy to scan and operate.
- Prefer a clean premium SaaS/operations aesthetic using the existing StockSpace visual language, spacing scale, colors, and components. Do not redesign the whole application for a single feature.
- Use visual variety only when it improves hierarchy. Do not force asymmetrical grids, oversized whitespace, decorative textures, nested cards, or cinematic effects onto data-heavy screens.
- Use the existing icon libraries and design components consistently. Do not replace all icons, fonts, or UI primitives only to follow a generic design trend.
- Use rounded containers, subtle borders, and soft shadows when they clarify grouping. Avoid excessive borders, harsh shadows, gradients, blur, and decoration that reduce readability or performance.
- Use animation purposefully for navigation, drawers, modals, hover/active feedback, and progressive disclosure. Prefer `transform` and `opacity` with short custom easing; respect `prefers-reduced-motion`.
- For public landing and warehouse-detail pages, premium editorial or glass effects may be used selectively. For admin/WMS pages, prioritize density, clarity, keyboard access, and fast interaction.
- On mobile, collapse multi-column layouts, make action groups wrap or stack, keep touch targets comfortable, and use drawers or horizontal scrolling for navigation and wide data tables.
- Do not add new fonts, icon packages, image assets, animation libraries, or background effects unless the existing project cannot meet the requirement and the user approves the addition.

## Data and API rules

- Do not change API request or response contracts from the frontend without explicit user approval.
- Use the existing API configuration and authentication flow.
- Handle loading, empty, error, and success states for new data-driven UI.
- Never hard-code credentials, production URLs, user identifiers, or environment-specific secrets.

## Change workflow

1. Read this file and inspect the relevant existing code before editing.
2. Make the smallest scoped change that solves the request.
3. Use `apply_patch` for source-file edits.
4. Run the relevant lint, build, or test commands after editing.
5. Review the final diff and confirm no backend or unrelated files were changed.

## Verification

- Prefer `npm run lint` and `npm run build` when the local npm setup works.
- If a command is unavailable, use an equivalent local tool only when it does not change project behavior, and report the limitation clearly.
- Do not mark work complete when the build fails unless the failure is unrelated and clearly reported.

## Completion report

When finishing a task, summarize:

- What changed and which frontend files were touched.
- What checks were run and whether they passed.
- Any remaining limitation, warning, or follow-up needed.
