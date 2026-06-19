# Operations Scheduler & Platform Integrations — Summary Report (7-6-26)

This report details the work completed to date on the **Holiday Homes SaaS** platform, covering API integrations, serverless hosting optimization, operations scheduling fixes, and routing precision corrections.

---

## 1. Platform-Level Integrations & Key Propagation
* **Objective**: Centralize configuration of platform API keys (Claude AI and DocuSign) so that the super admin can manage them globally and propagate changes to all client tenant organizations.
* **Database Propagation**:
  - Modified the integration save route (`/api/settings/integrations`) to check for super admin permissions and write key updates globally to all `Organization.settings` JSON columns.
  - Implemented the same propagation logic on the super admin preferences save route (`/api/admin/preferences`).
* **Self-Healing Sync**:
  - Added a backend check on dashboard load (`/api/admin/preferences` GET handler) that automatically checks if keys in the super admin's profile are missing from any tenant organization settings, automatically backporting and repairing them.
* **Tenant User Bypass**:
  - Removed client-side constraints in the scheduler that blocked non-admin users from utilizing the scheduler if they didn't have an API key stored in their local browser `localStorage`. The server now seamlessly falls back to the database-level platform credentials.
  - Added tenant-friendly error mapping to present clear instructions to users if integrations are completely unconfigured.

---

## 2. Next.js & Vercel Serverless Optimization
* **Objective**: Resolve serverless timeouts ("unexpected connection closed") causing page crashes on Vercel during AI schedule generation.
* **Duration Limits**:
  - Extended the timeout threshold to 60 seconds (by exporting `maxDuration = 60` in the API route handlers: `/api/schedule-ai`, `/api/settings/auto-map`, and `/api/translate`).
* **Fast Model Recommendation**:
  - Changed the default fallback AI model from the slow `claude-opus-4-5` to the highly optimized `claude-3-5-sonnet-20241022` model.
  - Added model selection warnings to guide users to choose fast models (Sonnet or Haiku) for scheduling and translation, avoiding serverless timeouts under Vercel Hobby accounts.

---

## 3. Same-Building Heuristics & 0-Minute Transition Gaps
* **Objective**: Remove unnecessary buffer delays when staff members perform consecutive tasks inside the same building.
* **AI Scheduler Prompt Rules**:
  - Refined the AI scheduling system instructions in `/api/schedule-ai/route.ts` to strictly enforce a `0-minute transition gap` with no travel buffer and no preparation time between consecutive units in the same building.
* **Local Heuristic Solver Updates**:
  - Implemented building name prefix matching (e.g., matching `BROYAL` -> Burj Royale, `BCROWN` -> Burj Crown) inside the client-side scheduler heuristics.
  - Modified candidate evaluation to detect same-building transitions and subtract the default 15-minute padding, ensuring back-to-back tasks start immediately at the end time of the prior task.

---

## 4. Manual Task Scheduling Windows
* **Objective**: Resolve the issue where manually created checkout cleaning tasks with custom start times (e.g., `11:00 AM`) were marked "unassigned" due to overly tight deadlines (`start + duration`).
* **Default Window Extension**:
  - Modified manual task creation to automatically set the deadline to the end of the shift (`1200` / 8:00 PM) instead of `start + duration`, allowing the crew assignment solver the necessary time slots to allocate cleaners.
* **Self-Healing Local Migration**:
  - Implemented an initialization hook that automatically detects and heals legacy manual tasks from `localStorage`, extending their deadlines to 8:00 PM to resolve prior scheduling conflicts.

---

## 5. Fallback Driving Duration Formula Optimization
* **Objective**: Correct excessive driving times (e.g., 85 minutes for JVC-to-Downtown) returned during OSRM rate-limiting or offline fallbacks.
* **Heuristic Calibration**:
  - Updated the local Haversine distance-to-duration formula inside the scheduler component to assume a realistic **50 km/h** average speed (down from 25 km/h), reduce the traffic factor to **1.2x** (down from 1.5x), decrease parking/prep padding to **10 minutes** (down from 20 minutes), and round to the nearest **5 minutes**.
  - This calibrated JVC-to-Downtown driving durations to a realistic **35 minutes**.

---

## 6. Transit Merging & Shared Ride Logic
* **Objective**: Correct the transit routing duration where local drives (e.g. Burj Crown to Burj Royale) were showing as 35 minutes due to faulty pooling logic.
* **Same-Origin Constraint**:
  - Updated the transit merging heuristics to ensure that cleaners are only grouped into a shared vehicle transit task if they are starting from the **same building** (or both starting from HQ). Cleaners at different buildings are assigned separate transit tasks.
* **Arrival/Departure Alignment**:
  - Adjusted the merge algorithm to set the departure time to the **earlier** of the ready times (`Math.min`), and the transit task duration to the actual travel time (`start + travelTime`) instead of stretching the vehicle task across the gap.
  - Result: Shared drives between close properties now correctly reflect the actual 5-10 minute travel times.
