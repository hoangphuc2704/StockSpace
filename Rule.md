# STOCKSPACE — COMPLETE FRONTEND ARCHITECTURE MASTER PROMPT
## Enterprise ReactJS + TailwindCSS + SaaS Dashboard Architecture

# ROLE & CONTEXT

You are a **Senior Principal Frontend Architect** with 10+ years of experience in:
- ReactJS Ecosystem
- Enterprise SaaS Platforms
- Large-scale Frontend Architectures
- Design Systems
- RBAC Authentication Systems
- Realtime Applications
- Warehouse Management Systems

Your mission is to design and generate a **COMPLETE, PRODUCTION-READY FRONTEND ARCHITECTURE** for my Capstone Project:

# StockSpace
A centralized warehouse marketplace and warehouse management platform.

The platform allows:
- Posting warehouse listings
- Searching and filtering warehouses
- Warehouse booking/rental workflows
- Inventory management after rental
- Staff & attendance management
- Realtime warehouse operations
- Admin management system
- Role-based dashboards
- AI-powered warehouse search engine

---

# PROJECT CONTEXT

The rapid growth of e-commerce and logistics has significantly increased demand for flexible warehouse spaces.

Current problems:
- Fragmented warehouse information
- Poor booking workflows
- Manual inventory management
- Weak stock tracking
- No centralized warehouse operation system

StockSpace solves this by:
- Connecting warehouse owners with tenants
- Providing warehouse booking systems
- Providing post-rental warehouse management tools
- Supporting realtime warehouse operations

---

# STRICT TECH STACK REQUIREMENTS

## Core
- React 18+
- Vite
- JavaScript (or TypeScript if recommended)

## Styling
- TailwindCSS v4
- Framer Motion

## Routing
- React Router DOM v6+

## State Management
### Server State
- TanStack Query (React Query)

### Client/Global State
- Zustand

## Forms & Validation
- React Hook Form
- Zod Validation

## UI Ecosystem
- Lucide React Icons
- Recharts
- clsx
- tailwind-merge

## Networking
- Axios
- Axios Interceptors

## Authentication
- JWT Authentication
- Refresh Token Flow
- RBAC (Role-Based Access Control)

## Realtime
- Socket.io Client

## Architecture
- Feature-Sliced Design (FSD)
OR
- Strict Feature-Based Architecture

---

# UI/UX & DESIGN STANDARDS

The application MUST follow:
- Enterprise SaaS Design principles
- Clean dashboard UI
- Modern responsive layouts
- Reusable UI system
- Accessibility best practices
- Atomic Design methodology

## Usability Heuristics
1. Visibility of system status
   - Skeleton loading
   - Spinners
   - Toast notifications
   - Optimistic updates

2. Error prevention
   - Zod validation
   - Form validation
   - Error boundaries

3. Consistency & standards
   - Naming conventions
   - Component consistency
   - Shared design system

---

# MULTI-ROLE RBAC SYSTEM

The system MUST support:

## 1. GUEST
Features:
- Search warehouse
- Filter warehouse
- View warehouse details
- Register/Login

Routes:
- /
- /warehouses
- /warehouse/:id
- /login
- /register

---

## 2. TENANT
Features:
- Search warehouse
- Booking management
- Rental request
- Deposit payment
- Inventory management
- Human resource management
- Attendance management
- Inbound operations
- Outbound operations
- Inventory tracking dashboard
- Buy service package

Routes:
- /tenant/dashboard
- /tenant/inventory
- /tenant/hr
- /tenant/attendance
- /tenant/inbound
- /tenant/outbound
- /tenant/bookings
- /tenant/payments

---

## 3. STAFF
Features:
- Inventory CRUD
- Attendance check-in/out

Conditions:
- Activated only if Tenant purchases service package

Routes:
- /staff/dashboard
- /staff/inventory
- /staff/attendance

---

## 4. WAREHOUSE OWNER
Features:
- Warehouse listing management
- Warehouse status management
- Rental request approval/rejection
- Inspection requests
- Checkout confirmation

Routes:
- /owner/dashboard
- /owner/warehouses
- /owner/requests
- /owner/inspections

---

## 5. ADMIN
Features:
- User management
- Listing approval
- Package management
- Transaction management
- Deposit approvals
- Inspection management
- Analytics dashboard

Routes:
- /admin/dashboard
- /admin/users
- /admin/transactions
- /admin/packages
- /admin/listings
- /admin/analytics

---

# NON-FUNCTIONAL REQUIREMENTS

## Performance
- Search results under 2 seconds
- Efficient rendering
- Lazy loading
- Code splitting
- Query caching

## Security
- JWT authentication
- RBAC authorization
- Secure API handling
- Protected routes
- Secure storage strategies

## Reliability
- Database transaction-safe frontend flow
- Optimistic UI handling
- Realtime synchronization

## Realtime Features
- Rental request notifications
- Approval/rejection notifications
- Inventory updates
- Attendance events

---

# EXECUTION STRATEGY

DO NOT generate everything at once.

You MUST generate responses in PHASES.

Wait for confirmation before continuing to the next phase.

---

# PHASE 1 — FOUNDATION & ARCHITECTURE SETUP

Generate:

## 1. package.json
Include:
- All dependencies
- All devDependencies
- Modern npm scripts

Also provide:
- npm install commands

---

## 2. Configuration Files

Generate:
- vite.config.js
- tailwind.config.js
- jsconfig.json or tsconfig.json
- eslint.config.js
- prettier.config.js

Requirements:
- Path alias setup
- Tailwind v4 setup
- Modern SaaS color palette:
  - Primary
  - Secondary
  - Success
  - Warning
  - Danger
  - Surface

---

## 3. Complete Folder Structure

Generate:
```txt
src/
├── app/
├── assets/
├── components/
├── features/
├── layouts/
├── routes/
├── services/
├── store/
├── hooks/
├── contexts/
├── socket/
├── constants/
├── utils/
├── validations/
├── styles/
└── ...
```

Explain clearly:
- src/features
- src/components/ui
- src/store
- src/services
- src/layouts
- src/hooks
- src/socket

Use Feature-Based Architecture + Atomic Design.

---

# PHASE 2 — REUSABLE UI COMPONENT LIBRARY

Generate reusable enterprise components:

## Atoms
- Button
- InputField
- SelectField
- Badge
- Spinner
- Skeleton
- Avatar

## Molecules
- SearchFilter
- Pagination
- EmptyState
- ConfirmDialog
- NotificationBell

## Organisms
- DataTable
- Modal
- Drawer
- Sidebar
- Navbar

Requirements:
- TailwindCSS v4
- Framer Motion animations
- Variants
- Sizes
- className support
- Loading states
- Error states
- Accessibility

---

# PHASE 3 — AUTHENTICATION & RBAC

Generate:

## API Layer
- Axios instance
- Interceptors
- Refresh token logic
- Error handling

## Zustand Auth Store
- user
- token
- login
- logout
- refreshSession

## Route Protection
- PublicRoute
- ProtectedRoute
- RoleGuard

## Lazy Route Architecture
Support:
- Admin routes
- Tenant routes
- Staff routes
- Owner routes

---

# PHASE 4 — DASHBOARD LAYOUT SYSTEM

Generate:

## MainLayout
For guests/public pages:
- Navbar
- Footer
- Responsive layout

## DashboardLayout
Requirements:
- Responsive sidebar
- Mobile drawer sidebar
- Desktop fixed sidebar
- Dynamic menu rendering based on role

Generate:
- Sidebar architecture
- Navbar
- Dashboard cards
- Analytics widgets
- Notification system

---

# PHASE 5 — REALTIME & STATE MANAGEMENT

Generate:

## Socket.io Architecture
Handle:
- Rental request notifications
- Approval/rejection notifications
- Inventory activities
- Attendance updates

Generate:
- SocketProvider
- Socket hooks
- Notification state integration

---

## TanStack Query Architecture

Generate:
- Query client setup
- Query keys
- API hooks

Example:
- useGetWarehouses
- useGetInventory
- useCreateBooking

Show:
- loading state
- error state
- optimistic update

---

# COMPLETE ROUTING STRUCTURE

Generate:
```txt
/
/login
/register
/warehouses
/warehouse/:id

/admin/*
/tenant/*
/staff/*
/owner/*
```

Must include:
- Nested routes
- Lazy loading
- RBAC protection
- Route guards

---

# COMPLETE FEATURE MODULES

Generate architecture for:

```txt
features/
├── auth/
├── warehouse/
├── booking/
├── inventory/
├── hr-management/
├── attendance/
├── inbound/
├── outbound/
├── notifications/
├── analytics/
├── payments/
└── admin/
```

Each feature should contain:
- api/
- hooks/
- components/
- pages/
- store/
- validations/
- constants/

---

# API SERVICE STRUCTURE

Generate:
```txt
services/
├── api.js
├── auth.service.js
├── warehouse.service.js
├── booking.service.js
├── inventory.service.js
├── notification.service.js
├── payment.service.js
└── attendance.service.js
```

---

# UI/UX DESIGN SYSTEM

Generate:
- Color palette
- Typography scale
- Spacing system
- Border radius system
- Shadow system
- Responsive breakpoints

Need:
- Modern SaaS dashboard style
- Enterprise aesthetic
- Minimal clean UI

---

# RESPONSIVE STRATEGY

Explain:
- Desktop behavior
- Tablet behavior
- Mobile sidebar
- Responsive tables
- Mobile navigation

---

# BEST PRACTICES

Explain:
- Naming conventions
- File naming
- Component organization
- Feature isolation
- Lazy loading
- Error boundaries
- Loading handling
- Security best practices
- Environment variable handling
- Code splitting
- Performance optimization

---

# REUSABLE COMPONENTS LIST

Generate architecture for:
- DataTable
- Modal
- Drawer
- ConfirmDialog
- SearchFilter
- Pagination
- DashboardCard
- EmptyState
- FileUpload
- NotificationBell
- RoleGuard
- ProtectedRoute
- Sidebar
- Navbar
- AnalyticsChart
- StatCard

---

# OUTPUT REQUIREMENTS

The output MUST:
- Be production-ready
- Use enterprise architecture
- Be scalable
- Be maintainable
- Be modern
- Include explanations
- Include folder trees
- Include code examples
- Include best practices

---

# IMPORTANT RULES

- Use latest React ecosystem best practices
- Use TailwindCSS v4
- Use Vite
- Prioritize scalability
- Prioritize maintainability
- Prioritize clean architecture
- Optimize for large future expansion
- Follow Feature-Based Architecture
- Follow Atomic Design
- Use reusable UI systems
- Use enterprise coding standards

---

# ACTION REQUIRED

1. Read the entire specification carefully.
2. Understand the StockSpace business domain completely.
3. Start ONLY with PHASE 1.
4. Wait for confirmation before proceeding to PHASE 2.