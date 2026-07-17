# Pawra

Pawra is a web app that helps pet owners understand their pets a little better.
Understand what your pet is trying to tell you. Pawra combines AI-assisted behavior interpretation with your observations to create explanations that improve over time.
All explanations act as a helpful second opinion, not a medical or veterinary diagnosis.

> **Project Status:** MVP / early beta.

## Key Features

- **AI-Assisted Interpretation:** Interprets behavior and vocalizations to provide a clearer sense of what an animal may be trying to communicate.
- **Human Feedback Loop:** Allows users to rate and correct predictions, helping refine explanations over time.
- **Transparent Audit Panel:** A dedicated area for admins and vets to review and moderate user-submitted corrections.
- **Behavior History:** Tracks emotional evolution and observations over time.
- **Support, Not Diagnosis:** Every feature is designed as a second opinion, not a replacement for veterinary care.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript |
| API | tRPC |
| Validation | Zod |
| Database | Supabase (Postgres) |
| Authentication | Supabase Auth |
| Hosting | Vercel |

tRPC and Zod keep the client and server aligned through end-to-end type safety and input validation.

## Security & Access Control

- **Database-Level Protection (RLS):** Supabase Row-Level Security (RLS) controls which rows can be accessed directly in the database.
- **Protected Routes:** Authenticated flows are enforced on the server through tRPC procedures, not just hidden in the UI.
- **Role-Based Access:** Admin and vet-only areas are gated by backend role checks before data is returned.

## Roadmap

- **Phase 1 — Core Analysis:** Improve interpretation quality and make analysis outputs easier to understand.
- **Phase 2 — Feedback Review:** Strengthen the audit workflow and add clearer ways to track feedback quality over time.
- **Phase 3 — Broader Inputs:** Support additional input types and refine how the system handles more pet behaviors and contexts.

## Screenshots

| Landing Page | Analysis Screen |
|---|---|
| _Add screenshot_ | _Add screenshot_ |

| Feedback Flow | Audit Panel |
|---|---|
| _Add screenshot_ | _Add screenshot_ |

## Contact & Links

- **Repository:** _Add repo link_
- **Live Application:** _Add deployment link_
- **Contact:** _Add public contact email or website_

## License

Private / Proprietary. All rights reserved.
