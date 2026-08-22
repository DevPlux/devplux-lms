# DevPlux LMS

<p align="center">
  <img src="./cover/DevPlux%20LMS.png" alt="DevPlux LMS" width="100%">
</p>

A modern, secure, multi-tenant Learning Management System developed by **DevPlux Software Solutions**.

DevPlux LMS is designed for educational institutes to centrally manage students, teachers, parents, courses, batches, classes, attendance, learning materials, assessments, academic performance, notifications, reporting and other academic operations.

Each institute receives an isolated LMS environment while the platform is maintained and continuously improved from a shared application architecture.

---

## Core Features

The planned platform includes:

- Student Management
- Teacher Management
- Parent / Guardian Management
- Course Management
- Subject Management
- Batch Management
- Class Management
- Class Scheduling
- Recorded Lessons
- Study Materials
- Assignments
- Assessments
- Attendance Management
- QR Attendance
- Student Progress Tracking
- Academic Performance Tracking
- User Notifications
- Reports & Analytics
- Institute Administration
- Role-Based Access Control
- Multi-Tenant Institute Management
- Secure Authentication
- Professional Administration Dashboard

---

# Architecture

DevPlux LMS follows a **multi-tenant SaaS architecture**.

A single platform can serve multiple educational institutes while maintaining logical data isolation between institutes.

Example:

```text
DevPlux LMS
│
├── abc-academy.devplux.com
│       └── ABC Academy
│
├── xyz-institute.devplux.com
│       └── XYZ Institute
│
└── another-institute.devplux.com
        └── Another Institute
```

Each institute is represented internally by a `Tenant`.

The incoming hostname is resolved to a tenant before tenant-specific business logic is executed.

```text
Incoming Request
       │
       ▼
TenantResolverMiddleware
       │
       ▼
TenantDomain
       │
       ▼
Tenant
       │
       ▼
Authenticated User
       │
       ▼
Membership / Role
       │
       ▼
Protected LMS Resource
```

---

# Repository Structure

```text
devplux-lms/
│
├── backend/
│   └── NestJS backend application
│
├── frontend/
│   └── Nuxt frontend application
│
├── docs/
│   └── Project documentation
│
├── compose.yaml
├── .gitignore
└── README.md
```

---

# Technology Stack

## Frontend

| Area | Technology |
|---|---|
| Framework | Nuxt 4 |
| UI Framework | Vue 3 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Testing | Vitest / Playwright |

## Backend

| Area | Technology |
|---|---|
| Framework | NestJS |
| Language | TypeScript |
| API | REST |
| API Documentation | Swagger / OpenAPI |
| Testing | Jest / Supertest |

## Database & Infrastructure

| Area | Technology |
|---|---|
| Primary Database | PostgreSQL |
| ORM | Prisma |
| Local Database | Docker |
| Cache | Redis |
| Background Jobs | BullMQ |
| Real-Time | Socket.IO |

## Storage & Media

| Area | Technology |
|---|---|
| File Storage | Cloudflare R2 / AWS S3 |
| Recorded Video | Mux / Vimeo initially |
| Future Video Storage | Private Object Storage + CDN |

## Communication

| Area | Technology |
|---|---|
| Email | Resend / Brevo / Amazon SES |
| WhatsApp | WhatsApp Business Cloud API |

## Other Services

| Area | Technology |
|---|---|
| Payments | PayHere / WebXPay / Manual Verification |
| PDF Generation | Server-Side PDF Generation |
| QR | Signed QR Tokens |
| CI/CD | GitHub Actions |
| Monitoring | Sentry + Structured Logs |
| Deployment | Docker + Managed Cloud Services |

---

# Backend Development Status

The backend foundation is currently under active development.

## Completed / Current Foundation

### Application Foundation

- NestJS project setup
- TypeScript configuration
- Environment configuration
- Global validation
- Swagger/OpenAPI
- PostgreSQL integration
- Prisma ORM
- Docker-based local PostgreSQL
- Database migrations
- Health checking

### Multi-Tenancy

Implemented:

- `Tenant`
- `TenantDomain`
- Tenant hostname resolution
- `TenantResolverMiddleware`
- `@CurrentTenant()`
- Tenant/JWT context validation

Example:

```text
abc-academy.devplux.com
        │
        ▼
TenantDomain
        │
        ▼
ABC Academy Tenant
```

Tenant-owned data must always be isolated using `tenantId`.

---

# Authentication

The authentication foundation includes:

- Password hashing using bcrypt
- Tenant-aware login
- JWT access tokens
- JWT verification
- Access-token guards
- `@CurrentUser()`
- Refresh tokens
- Refresh-token hashing
- Database-backed authentication sessions
- HTTP-only refresh cookies
- Refresh-token rotation
- Session revocation
- Logout

Authentication flow:

```text
Login
  │
  ├── Validate Tenant
  │
  ├── Validate User
  │
  ├── Validate Password
  │
  ├── Validate Membership
  │
  ▼
Access Token
+
Refresh Token
  │
  ▼
AuthSession
```

The raw refresh token is not stored in PostgreSQL.

Only its hash is stored.

---

# Authorization

Authorization uses institute memberships and roles.

Current institute roles include:

```text
INSTITUTE_ADMIN
TEACHER
STUDENT
PARENT
ACADEMIC_MANAGER
ACCOUNTANT
```

Protected endpoints can use:

```ts
@Protected(InstituteRole.INSTITUTE_ADMIN)
```

or multiple roles where required.

The protection pipeline includes:

```text
JWT Authentication
       │
       ▼
Tenant Context Validation
       │
       ▼
Live Membership Validation
       │
       ▼
Role Validation
       │
       ▼
Controller
```

---

# User and Membership Architecture

Authentication identity and institute membership are intentionally separated.

```text
User
 │
 └── Membership
       │
       ├── Tenant
       └── InstituteRole
```

A `User` represents the authentication identity.

A `Membership` represents the user's relationship with an institute.

Student, Teacher and Parent profiles must **not implement separate authentication systems**.

They should integrate with the existing `User` and `Membership` architecture.

---

# Institute Profile

Institute-specific information is separated from the core `Tenant` model.

```text
Tenant
  │
  └── TenantProfile
```

`TenantProfile` currently supports information such as:

- Email
- Phone
- Address
- Website
- Country
- Timezone
- Logo URL

This keeps the core tenant model focused on tenancy while allowing institute information to evolve independently.

---

# Planned Domain Modules

The LMS is being implemented incrementally.

```text
Platform Foundation
│
├── Multi-Tenancy
├── Authentication
├── Authorization
├── Institute Administration
│
├── People Core
│   ├── Students
│   ├── Teachers
│   ├── Parents
│   └── Parent-Student Relationships
│
├── Academic Core
│   ├── Courses
│   ├── Subjects
│   ├── Batches
│   ├── Classes
│   └── Class Schedules
│
├── Enrollment
├── Attendance
├── QR Attendance
├── Learning Materials
├── Recorded Lessons
├── Assignments
├── Assessments
├── Progress Tracking
├── Notifications
├── Reports
└── Analytics
```

---

# Development Team Ownership

To reduce merge conflicts, development areas are separated.

## Core / Platform Development

Responsible for:

```text
Authentication
Authorization
JWT
Refresh Sessions
Tenant Security
Membership Security
Institute Administration
Platform-Level Infrastructure
```

Avoid modifying these modules without coordination:

```text
src/modules/auth/
src/modules/users/
src/modules/memberships/
src/common/guards/
src/common/decorators/
src/common/middleware/
```

---

## Academic Core

Responsible for:

```text
Course
Subject
Batch
Class
ClassSchedule
```

Suggested module locations:

```text
src/modules/courses/
src/modules/subjects/
src/modules/batches/
src/modules/classes/
src/modules/class-schedules/
```

---

## People Core

Responsible for:

```text
StudentProfile
TeacherProfile
ParentProfile
ParentStudent
```

Suggested module locations:

```text
src/modules/students/
src/modules/teachers/
src/modules/parents/
src/modules/parent-students/
```

---

# Critical Multi-Tenant Development Rules

Every developer must follow these rules.

## 1. Never trust tenantId from the client

Do not use a client-supplied tenant ID as the authority for tenant ownership.

Avoid:

```ts
const tenantId = dto.tenantId;
```

Prefer the resolved tenant context:

```ts
@CurrentTenant() tenant
```

---

## 2. Scope tenant-owned queries

Incorrect:

```ts
where: {
  id,
}
```

Correct:

```ts
where: {
  id,
  tenantId: tenant.id,
}
```

A user from Tenant A must never be able to retrieve or modify Tenant B data.

---

## 3. Validate cross-model relationships

If a Batch references a Course, both must belong to the same tenant.

If a Parent is connected to a Student, both must belong to the same tenant.

Never create cross-tenant relationships.

---

## 4. Reuse authentication infrastructure

Do not create another:

- JWT implementation
- Password system
- Authentication middleware
- Tenant resolver
- Role system
- Membership system

Use the shared platform implementation.

---

## 5. Use shared protection

For protected routes use the shared protection mechanism.

Example:

```ts
@Post()
@Protected(InstituteRole.INSTITUTE_ADMIN)
create(...) {
  // ...
}
```

---

# Prisma Development Rules

`prisma/schema.prisma` is shared by all backend developers.

It is therefore a high-conflict file.

Before adding relationships involving:

- Tenant
- User
- Membership
- Academic Core models
- People Core models

coordinate the database design with the team.

After changing Prisma:

```bash
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma migrate dev --name meaningful_migration_name
pnpm exec prisma generate
```

Commit both:

```text
schema.prisma
+
migration
```

Do not edit or delete another developer's migration without coordination.

---

# Git Workflow

Recommended branch structure:

```text
main
│
└── development
     │
     ├── feature/auth-*
     ├── feature/platform-*
     ├── feature/academic-core
     └── feature/people-core
```

Create feature branches from the latest `development` branch.

Example:

```bash
git checkout development
git pull

git checkout -b feature/academic-core
```

Commit focused changes:

```bash
git add .
git commit -m "feat: add course management"
```

Push:

```bash
git push -u origin feature/academic-core
```

Then open a Pull Request into:

```text
development
```

Do not directly push unfinished feature development to `main`.

---

# Local Development

## Requirements

Install:

- Git
- Node.js
- pnpm
- Docker Desktop
- IDE such as WebStorm / VS Code
- Postman (recommended)

Install pnpm if required:

```bash
npm install -g pnpm
```

---

# Clone Project

```bash
git clone <repository-url>

cd devplux-lms
```

---

# Install Backend Dependencies

```bash
cd backend

pnpm install
```

---

# Environment Variables

Create:

```text
backend/.env
```

Use the project's `.env.example` as the reference.

Never commit the real `.env`.

Important configuration includes:

```env
NODE_ENV=development
PORT=4000

FRONTEND_URL=http://localhost:3000

DATABASE_URL=<local-postgresql-connection>

JWT_ACCESS_SECRET=<secret>
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=<secret>
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_REFRESH_NAME=refresh_token
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_REFRESH_MAX_AGE_MS=604800000
```

Secrets must be different and securely managed in production.

---

# Start PostgreSQL

From the repository root:

```bash
docker compose up -d
```

Check:

```bash
docker compose ps
```

The current local Docker configuration maps PostgreSQL to a host port configured by the project.

Ensure `DATABASE_URL` uses the same host port configured in `compose.yaml`.

---

# Prisma Setup

From `backend/`:

```bash
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate dev
```

---

# Start Backend

```bash
pnpm run start:dev
```

Default development API:

```text
http://localhost:4000/api/v1
```

Swagger:

```text
http://localhost:4000/docs
```

Health endpoint:

```text
GET http://localhost:4000/api/v1/health
```

Expected:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

---

# Tenant Testing

Tenant-aware endpoints require a hostname that exists in `TenantDomain`.

Development example:

```text
abc-academy.devplux.com
```

When using Postman, provide:

```text
Host: abc-academy.devplux.com
```

Protected endpoints also require:

```text
Authorization: Bearer <access-token>
```

---

# Authentication API

Current authentication flow includes endpoints such as:

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

The refresh token is stored in an HTTP-only cookie and should not be exposed to frontend JavaScript.

---

# Security Rules

Never commit:

```text
.env
JWT secrets
Database passwords
Production API credentials
Refresh tokens
Access tokens
```

Never return:

```text
passwordHash
refreshTokenHash
internal authentication secrets
```

Always validate tenant ownership before returning or modifying tenant-owned resources.

Production cookies must use appropriate secure HTTPS settings.

---

# Testing

Backend:

```text
Jest
Supertest
```

Frontend:

```text
Vitest
Playwright
```

Developers should test at minimum:

- Successful requests
- DTO validation
- Authentication failures
- Authorization failures
- Missing resources
- Duplicate records
- Tenant isolation
- Cross-tenant relationship prevention

---

# API Documentation

Swagger/OpenAPI documentation is available during local development at:

```text
http://localhost:4000/docs
```

New API endpoints should be designed so they can be documented and tested consistently through Swagger and Postman.

---

# Development Principles

The project follows several core principles:

1. Multi-tenant isolation first.
2. Authentication identity is separate from academic profiles.
3. Tenant context is resolved by trusted backend infrastructure.
4. Authorization is enforced server-side.
5. Controllers remain thin.
6. Business logic belongs in services.
7. DTOs validate incoming requests.
8. Prisma manages database access.
9. Shared infrastructure should not be duplicated.
10. Feature development should remain modular.
11. Database relationships should be coordinated before migration.
12. Security-sensitive information must never be exposed through API responses.

---

# Current Development Direction

Current platform development is progressing through:

```text
Multi-Tenant Foundation        DONE
        ↓
User / Membership Foundation   DONE
        ↓
Authentication Foundation      DONE
        ↓
Authorization Foundation       DONE
        ↓
Institute Profile              IN PROGRESS
        ↓
Institute User Administration
        ↓
Academic + People Integration
        ↓
Enrollment
        ↓
Attendance
        ↓
Assignments / Assessments
        ↓
Learning Materials
        ↓
Progress Tracking
        ↓
Notifications
        ↓
Reports / Analytics
```

Academic Core and People Core can be developed in parallel with platform development.

---

# Deployment Direction

The planned production architecture consists of:

```text
Nuxt Frontend
      │
      ▼
NestJS API
      │
      ├── PostgreSQL
      ├── Redis
      ├── Object Storage
      ├── Background Workers
      └── External Services
```

Services will be containerized where appropriate and deployed using managed cloud infrastructure.

CI/CD will use GitHub Actions.

Production monitoring will use structured application logging and Sentry.

---

# Company

**DevPlux Software Solutions**

Website: `www.devplux.com`

DevPlux LMS is developed and maintained as part of the DevPlux software platform ecosystem.

---

## License

Proprietary software.

Copyright © DevPlux Software Solutions.

Unauthorized copying, redistribution, modification or commercial use of this software is prohibited unless explicitly authorized by DevPlux Software Solutions.