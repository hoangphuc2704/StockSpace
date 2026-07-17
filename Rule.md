# STOCKSPACE UI RULES
## Anti-Slop Interface Generation Guide For This Project

This file defines the mandatory UI generation rules for StockSpace. Apply these rules before creating or redesigning any interface in this repository.

---

## 1. Product Context

### What StockSpace Is
StockSpace is a warehouse marketplace and warehouse operations platform.

The product combines two interface worlds:
- Public marketplace experiences for discovering and booking warehouses
- Operational dashboards for tenants, owners, staff, inspectors, and admins

### Who Uses It
- Guests searching for warehouse space
- Tenants renting and managing warehouse operations
- Warehouse owners posting listings and handling requests
- Staff performing inventory and attendance tasks
- Inspectors reviewing warehouse activity
- Admins supervising the whole platform

### What The UI Must Communicate
- Trust for transactions and warehouse data
- Operational clarity for daily logistics work
- Enterprise structure without looking generic
- Modern product quality with strong visual hierarchy

---

## 2. Stack And System Boundaries

### Real Project Stack
When generating UI for this repository, follow the stack that already exists here:
- React + Vite
- JavaScript
- TailwindCSS v4
- Framer Motion
- Redux Toolkit
- React Router
- TanStack Query
- Lucide React

### Design System Rule
- Do not randomly mix Material UI, Ant Design, Shadcn, Chakra, Bootstrap, or other UI systems into the same screen.
- Prefer custom Tailwind-based components built from the existing local component system in `src/components`.
- Reuse existing primitives such as `Button`, `Badge`, `InputField`, `Modal`, `Drawer`, `DataTable`, and helper `cn()`.
- If a new component is needed, make it look native to this repo instead of imported-from-elsewhere.

---

## 3. Anti-Slop Principles

### Forbidden Output
- Do not produce a generic SaaS dashboard that could belong to any startup.
- Do not rely on empty hero sections, stock cards, weak spacing, or placeholder blocks.
- Do not generate UI that is visually disconnected from warehouse, logistics, mapping, inventory, or booking workflows.
- Do not leave unfinished states, empty labels, dead buttons, or fake filters.
- Do not use Lorem Ipsum, placeholder metrics, or meaningless repeated content.

### Required Output Quality
- Every generated screen must feel intentionally designed for logistics and warehouse operations.
- Every page must have a clear information hierarchy, a usable task flow, and meaningful data labels.
- Layout structure must differ based on page purpose:
  - Marketplace pages should feel more visual, persuasive, and browseable
  - Dashboard pages should feel denser, clearer, and action-oriented
- Add one or two memorable details per screen so it does not look templated:
  - spatial/warehouse cues
  - operational status ribbons
  - booking timeline fragments
  - availability signals
  - inventory density visuals
  - map/location emphasis

---

## 4. Context Analysis Before Writing Code

Before generating UI, analyze these points first:

### A. Business Goal
Identify the page purpose:
- Discover warehouses
- Compare listings
- Submit booking or request actions
- Manage rented warehouse operations
- Monitor staff or attendance
- Review inspections
- Approve admin workflows

### B. User Role
The UI must reflect the role using it:
- Guest: simple, confidence-building, conversion-focused
- Tenant: operational, data-rich, fast to scan
- Owner: asset-focused, approval-oriented
- Staff: task-first, mobile-friendly, minimal friction
- Inspector: evidence and status clarity
- Admin: overview, controls, audit visibility

### C. Mood And Tone
Use mood intentionally instead of defaulting to generic modern:
- Marketplace: credible, polished, spatial, aspirational
- Operations dashboard: efficient, structured, calm under pressure
- Admin: precise, authoritative, high signal

### D. Screen Type
Classify the screen before designing:
- Landing
- Listing/search
- Detail page
- Form/workflow
- Analytics dashboard
- Data table management
- Realtime monitoring

---

## 5. Visual Direction For StockSpace

### General Style
- Clean enterprise foundation with stronger character than a default admin template
- Use depth, contrast, and whitespace with intention
- Favor strong section framing, layered surfaces, and visible grouping
- Avoid flat white-page layouts unless the page truly benefits from maximum density

### Color Strategy
- Keep colors disciplined and semantic
- Primary color should feel trustworthy and product-defining
- Use success, warning, and danger clearly for operations and status
- Neutral surfaces must support long dashboard sessions without visual fatigue
- Avoid random accent colors that do not map to system meaning

### Typography
- Build a clear hierarchy for:
  - page title
  - section title
  - card title
  - metric value
  - support text
  - table/meta labels
- Avoid oversized headings on dense dashboard screens
- Use compact, readable typography for tables and operational summaries

### Spacing
- Use consistent spacing rhythm across sections, cards, forms, and tables
- Whitespace should create clarity, not emptiness
- Dense screens still need grouping gaps to reduce cognitive load

### Motion
- Use Framer Motion sparingly and purposefully
- Good uses:
  - page entrance
  - filter/result transitions
  - drawer/modal reveal
  - status change emphasis
- Avoid decorative motion that slows down warehouse workflows

---

## 6. Layout Rules

### Marketplace Pages
- Prioritize browsing, comparison, trust, and conversion
- Use richer imagery, clearer pricing, location emphasis, and availability signals
- Filters must feel useful and complete, not ornamental
- Search and browse actions should be visible early in the page

### Dashboard Pages
- Prioritize task completion and scan speed
- Lead with operational summary, then active tasks, then detail tables
- Cards must communicate real meaning, not just show 4 random KPIs
- Tables need strong header contrast, row states, empty states, and action clarity

### Forms And Workflow Screens
- Break complex actions into understandable sections
- Group fields by intent: identity, location, pricing, capacity, operations, confirmation
- Help text must reduce mistakes instead of repeating field labels
- Primary and secondary actions must be obvious

### Responsive Behavior
- Mobile is required, especially for staff/task-oriented screens
- Tables should degrade intentionally:
  - stacked cards
  - priority columns
  - horizontal scroll only when unavoidable
- Sidebar and dense controls must remain usable on tablet and mobile

---

## 7. Dark Mode Protocol

Every newly generated UI must be checked for both light and dark mode readiness, even if only one mode is implemented immediately.

Required:
- Maintain readable contrast for text, borders, and surfaces
- Preserve hierarchy between page background, cards, elevated surfaces, and overlays
- Ensure status colors remain distinguishable in dark surfaces
- Avoid washed-out gray-on-gray combinations

If a component is not yet dark-mode ready, structure its classes and tokens so dark mode can be added cleanly later.

---

## 8. Reuse And Modernization Rules

### If This Is A Redesign
- Audit the existing screen first
- Identify what is already working before replacing structure
- Preserve domain logic, route expectations, and existing component contracts unless the task explicitly changes them

### When Extending Existing UI
- Match established spacing and component behavior
- Improve weak hierarchy, not just add decoration
- Do not introduce a brand new visual language into one isolated page unless the user asks for a broader redesign

---

## 9. Content Rules

### No Placeholder Policy
- No Lorem Ipsum
- No empty charts
- No fake labels like "Item 1" or "Card Title"
- No unexplained percentages or metrics

### Content Must Be Domain-Specific
Use labels and content that belong to StockSpace, such as:
- occupancy
- available capacity
- warehouse type
- booking request
- inspection status
- inbound/outbound volume
- monthly rental
- fulfillment readiness
- staff attendance
- inventory movement

If mock content is necessary, it must still look like believable warehouse/logistics data.

---

## 10. Pre-Flight Checklist Before Output

Before finishing any UI generation task, verify:

- The screen clearly matches a StockSpace role and workflow
- The layout does not look like a generic admin template
- Components follow one coherent design system
- Light and dark contrast are both considered
- Spacing rhythm is consistent
- Typography hierarchy is obvious
- Status colors have semantic meaning
- Empty, loading, and error states exist where needed
- Motion is helpful, not decorative noise
- No placeholder copy or unfinished sections remain
- The output is runnable and complete

---

## 11. Execution Rules For Future UI Tasks

For any future UI generation in this repo, the AI must:

1. Read the target page and surrounding components first
2. Identify the role, business goal, and screen type
3. Reuse existing local components where possible
4. Create complete, integrated UI code instead of fragments
5. Preserve the current repo stack and architecture
6. Add polish only after hierarchy and usability are correct

---

## 12. Definition Of Good StockSpace UI

A good StockSpace interface should feel:
- operationally credible
- visually intentional
- easy to scan
- specific to warehouses and logistics
- scalable across roles
- polished without being overdesigned

If the result could be pasted into any random SaaS product with no changes, it is not good enough.
