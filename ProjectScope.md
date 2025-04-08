🚀 Project Scope: Proxy API User Management System & CRM
🔥 Project Title
OmniPanel – A Unified Admin Interface for Managing Users, Tracking API Usage, and Evolving into a CRM.

🎯 Overview
The goal is to build a stunning, scalable, and intuitive Admin Interface for managing users of our Proxy API Platform. This tool will be the control center for monitoring API usage across integrated services like ChatGPT, Firecrawl, Pexels, and others.

At launch, this will be a tracking-focused interface, providing real-time and historical insights on how users interact with our services. Future phases will transform this into a fully-featured CRM with automation, user communication, notes, reminders, and task tracking – similar in scope to HubSpot's core features.

🧩 Core Features – Phase 1 (Tracking Interface)
1. 🎛️ Dashboard (Global Overview)
Total API Calls (filterable by date range)

Breakdown by Service (ChatGPT, Firecrawl, etc.)

Most Active Users

Credit Consumption Graph (daily, weekly, monthly)

Source Domain Chart (showing which domains generate the most traffic)

2. 👤 User Management
Table View with Advanced Filters & Search

Columns: UserID, Access Key (masked w/ toggle), Status (Active/Inactive), Plan Type, Credits, Created At, Updated At, Multiple Domains (✅/❌), # of API Calls

User Detail View (when clicked):

Profile Overview (editable)

Usage Timeline

Credit Consumption by Service

Source Domains Used

Toggle to Activate/Deactivate

Reset Access Key button

Button to Top Up Credits or Change Plan

API Usage Log (for that user)

Tagging System for segmenting users

Notes & Activity Feed (see CRM section)

3. 🧠 Usage Tracker (API-Level Logs)
Table/List of all API interactions

Fields: Date, Action, Service Used, Source Domain, Credits Used

Filters:

Date Range

Service

Source Domain

Credits Used (range)

User ID

Export CSV / Download Logs

🛠️ System Capabilities
CRUD Operations via API (integrated UI)
Create New User (form with validations)

Update User Info

Reset or Rotate Access Key

Delete User (confirmation modal)

Bulk Credit Adjustments (multi-select users)

🔐 Admin User System (New Requirement)
1. Admin Roles & Permissions
Super Admin

Manager

Read-Only Analyst

Support Rep

Each role will control access to features like:

User modification

Credit adjustments

Notes & tags

Reminder creation

Export logs

2. Admin Panel
Add/edit/remove Admins

Role assignment

Activity log (who did what, when)

Admin Notes per user (private & shared)

Password reset & 2FA enforcement

🪄 Phase 2: Evolution into a CRM (Post-MVP)
1. 📝 Notes System
Add notes per user

Categorize notes: Support, Billing, Technical

Pin important notes

Mention/tag other admins

2. 📅 Reminder & Task System
Set reminder for specific users

Trigger email to assigned admin

Statuses: Pending, Done, Escalated

Daily Digest Email of Open Tasks

3. 💬 Messaging
Internal messages between admins

Optional: Send messages to user (email integration or dashboard notification)

Template-based quick responses

4. ⚡ Automations (Later Phase)
If user credits < threshold → notify admin

If usage spikes → log anomaly

If user inactive for X days → flag for follow-up

🌈 UX & Design Emphasis
1. Interface Principles
Built with Tailwind / ShadCN (or similar modern UI kits)

Google-level visual polish: whitespace, hierarchy, subtle animations

Light & Dark Mode

Snappy performance with Vue/React or Next.js

2. Table Features
Inline editing

Sticky headers

Toggle column visibility

Group by service or domain

Custom filters with save/load presets

3. Dashboard Widgets
Modular, drag-and-drop reorderable

Each widget can expand for details

Real-time updates via WebSocket or polling

