PROJECT_SPEC.md 1. Project overview Build a web platform similar to 
Google Forms, with one important added feature: the ability for form 
creators to attach a playable audio clip to selected questions. The 
platform must support two clearly separated experiences:
	1. A creator experience for authenticated users who build, 
publish, and analyze forms.
	2. A public responder experience for unauthenticated users 
who open shared forms and submit responses without creating an 
account. Strong analytics for published forms are a core requirement 
from day one. This is not an optional feature. ⸻ 2. Product goals 
The product should allow creators to:
	• sign in with Google
	• create and manage forms
	• add sections and questions
	• attach audio to selected questions
	• publish forms and share public links
	• view detailed statistics for responses The product should 
allow public responders to:
	• open a published form through a shared link
	• answer the form without signing in
	• play audio clips attached to questions
	• submit responses cleanly and simply The product should 
feel clean, minimal, and practical, with a default shadcn/ui look 
and no unnecessary visual complexity. ⸻ 3. Hard requirements These 
are non-negotiable constraints. Auth
	• Creators must authenticate with Google sign-in only.
	• Creators need an account to create, edit, publish, and 
analyze forms.
	• Public responders must not need an account to respond to a 
published form. Architecture
	• Use a monorepo.
	• Use apps/api for the backend.
	• Use apps/web for the frontend.
	• Keep API and web clearly separated.
	• Use separate .env files for API and web.
	• Include one root README for the whole repository.
	• Include one README inside apps/api.
	• Include one README inside apps/web. Stack
	• Frontend: Next.js
	• UI: shadcn/ui default theme
	• Backend: separate API service in apps/api
	• Database: PostgreSQL
	• ORM: Prisma
	• Infra: Supabase for hosted Postgres, Auth, and Storage
	• Hosting: Vercel for the web app Product behavior
	• Published forms must be accessible publicly without 
authentication.
	• Only published forms should be available publicly.
	• Creator-only resources must stay protected.
	• Analytics must only be visible to the form owner.
	• Audio clips must be playable directly from relevant 
questions. ⸻ 4. Core user flows 4.1 Creator flow An authenticated 
creator can:
	• sign in with Google
	• access a dashboard
	• create a new form
	• edit form title and description
	• add sections
	• add questions
	• configure question type
	• attach audio to selected questions
	• publish or unpublish a form
	• copy or share the public form link
	• open analytics for that form 4.2 Public responder flow A 
public responder can:
	• open a shared form URL
	• read the form
	• answer questions without logging in
	• play audio attached to supported questions
	• submit the response Responders do not have accounts in the 
MVP. ⸻ 5. MVP feature scope 5.1 Landing and auth
	• landing page
	• Google sign-in for creators
	• authenticated creator dashboard shell 5.2 Form builder 
Support at least:
	• form title
	• form description
	• sections
	• question creation
	• question editing
	• optional required flag if easy to include Supported 
question types:
	• short text
	• long text
	• single choice
	• multiple choice
	• linear scale
	• dropdown
	• date
	• time 5.3 Audio support
	• creators can attach an audio file to selected questions
	• audio files are stored in Supabase Storage
	• responders can play audio directly in the public form
	• audio UI must stay simple and consistent 5.4 Publishing
	• publish form
	• unpublish form
	• generate a public shareable link
	• public route renders only published forms 5.5 Responses
	• no-auth public submission flow
	• store one response per submission
	• store per-question answers
	• keep the data structure clean for later analytics 5.6 
Analytics Analytics are vital and must be supported by the data 
model and API from the start. Support at least:
	• total response count
	• response timeline
	• per-question breakdown
	• multiple-choice distributions
	• linear scale counts and averages
	• text response listing
	• completion-oriented metrics if practical in MVP ⸻ 6. 
Non-goals for MVP Do not add these unless explicitly requested 
later:
	• billing
	• teams or organizations
	• branching logic or conditional question logic
	• respondent accounts
	• AI-generated forms
	• collaborative editing
	• advanced theming
	• file upload answers
	• email campaigns
	• enterprise abstractions The MVP should stay focused and 
small. ⸻ 7. Technical design principles 7.1 General principles
	• Prefer simple and readable code.
	• Prefer pragmatic architecture over clever abstraction.
	• Keep the file structure understandable.
	• Do not introduce libraries unless clearly justified.
	• Avoid overengineering. 7.2 Backend principles
	• Prisma is the source of truth for the database schema.
	• Keep public and private routes clearly separated.
	• Do not design the system as if the client can safely write 
to everything directly.
	• Enforce ownership and publication rules properly.
	• Make analytics possible without hacks later. 7.3 Frontend 
principles
	• Use shadcn/ui default style.
	• Keep the UI clean, minimal, and consistent.
	• Prioritize usability over flashy effects.
	• Keep public response flow frictionless. ⸻ 8. Data model 
expectations The Prisma schema should be designed to support at 
least the following concepts:
	• creator user
	• form
	• form section
	• question
	• question options where relevant
	• question audio attachment where relevant
	• published/public access metadata
	• response submission
	• per-question answer The schema should be normalized and 
analytics-friendly. Do not model respondent accounts in the MVP. ⸻ 
9. API expectations The API should be designed with two clear access 
categories: 9.1 Private creator endpoints For authenticated creators 
only:
	• create form
	• edit form
	• manage sections and questions
	• attach audio metadata
	• publish or unpublish form
	• fetch creator-owned forms
	• fetch analytics for creator-owned forms 9.2 Public 
endpoints For unauthenticated users:
	• fetch published form by public identifier
	• submit a response to a published form Public endpoints 
must expose only what is needed for published forms. ⸻ 10. Repo 
structure expectations The repository should follow this shape: /
  README.md apps/
    api/
      README.md .env.example
    web/
      README.md .env.example
  docs/
    PROJECT_SPEC.md Actual file structure may expand, but the 
separation between apps/api and apps/web must remain clear. ⸻ 11. 
Environment separation Use separate environment files for each app. 
API env Should contain backend-specific variables such as:
	• database connection URL
	• direct database URL if needed
	• Supabase project configuration if required by backend
	• storage-related config if required by backend
	• auth secrets or API secrets if required Web env Should 
contain frontend-safe variables such as:
	• public API base URL
	• public Supabase values if needed by frontend
	• public app URL values if needed Do not mix backend-only 
secrets into the web app env. ⸻ 12. Documentation expectations The 
repository must include: Root README Explain:
	• what the project is
	• monorepo structure
	• how to install and run everything locally
	• how apps relate to each other API README Explain:
	• what apps/api is responsible for
	• how to configure env variables
	• how to run migrations
	• how to run the API locally Web README Explain:
	• what apps/web is responsible for
	• how to configure env variables
	• how to run the web app locally
	• how it interacts with the API ⸻ 13. Prompting rules for 
code generation When using Claude, Cursor, or another coding 
assistant for this project, follow these rules: 13.1 Use this file 
as the source of truth This spec defines the project constraints. 
Generated code must follow it. 13.2 Work in small focused prompts Do 
not ask the assistant to build the whole product in one shot. 
Preferred order:
	1. monorepo scaffold
	2. Prisma schema
	3. API contract
	4. API implementation
	5. web shell
	6. form builder UI
	7. public form flow
	8. analytics
	9. cleanup and docs 13.3 Re-anchor constraints in each 
prompt Every implementation prompt should repeat the relevant 
constraints from this file. 13.4 Always define scope and exclusions 
Each prompt should state:
	• what must be done now
	• what must not be done in this step 13.5 Avoid vague 
prompts Do not use prompts like:
	• build a Google Forms clone
	• make it scalable and production-ready
	• give me the best possible architecture These usually lead 
to bloated or misaligned output. ⸻ 14. Recommended implementation 
phases Phase 1: monorepo foundation
	• scaffold apps/api and apps/web
	• create root and app READMEs
	• add separate env example files
	• set up workspace structure Phase 2: Prisma schema
	• define normalized models for forms, questions, audio, 
responses, and analytics support Phase 3: API contract
	• define private creator endpoints and public responder 
endpoints
	• define publish/unpublish and submission flow Phase 4: API 
implementation
	• implement core CRUD
	• publish/unpublish
	• public form fetch
	• public submission Phase 5: web shell
	• landing page
	• Google sign-in entry
	• creator dashboard shell Phase 6: form builder
	• create/edit forms
	• add sections/questions
	• attach audio
	• manage publish state Phase 7: public response flow
	• render public form
	• audio playback in questions
	• submit responses without login Phase 8: analytics
	• response counts
	• timelines
	• distributions
	• scale summaries
	• text answer listing Phase 9: cleanup and documentation
	• refine docs
	• document env vars
	• explain setup and architecture clearly ⸻ 15. Final 
guidance This project should stay disciplined. The goal is not to 
build a huge generic survey SaaS in one pass. The goal is to build a 
clean, focused, maintainable MVP with:
	• Google-authenticated creators
	• public no-auth responders
	• audio-enabled questions
	• strong creator analytics
	• clean separation between API and web
	• simple, understandable architecture
Whenever an implementation choice is ambiguous, choose the simpler solution that still respects this spec.
