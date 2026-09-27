# WebQuiz - Secure Online Examination & Assessment Platform

WebQuiz is a high-integrity, secure web-based examination platform engineered for educational institutions and faculty. Built with Next.js 15, React 19, TypeScript, Prisma ORM, and Tailwind CSS, WebQuiz provides automated grading, anti-cheating proctoring telemetry, question importing, and offline resilience.

---

## 🌟 Key Features

### 🎓 1. Student Examination Experience
* **Secure Exam Lockdown**:
  * Real-time anti-cheating tracking: intercepts tab switching, window blurring, developer tools hotkeys (`F12`, `Ctrl+Shift+I`, `Ctrl+U`), and clipboard copy/paste attempts.
  * Configurable infraction strike limit before an exam is automatically submitted for grading.
* **Flexible Timer Modes**:
  * **Whole-Quiz Timer**: Global authoritative countdown for the entire assessment.
  * **Paced Per-Item Mode**: Enforces a strict per-question timer (e.g. 60 seconds per item) with automated locking of past questions when advancing.
* **Interactive Question Matrix & Navigation**:
  * Side matrix displaying all question numbers with color-coded status badges: Answered (Green), Unanswered (Gray), Current (Black/Indigo ring), and Locked (Per-item mode).
  * 🚩 **Flag for Review**: Students can flag questions to revisit later, indicated with an amber badge in the matrix and preserved in local storage.
  * ⌨️ **Keyboard Shortcuts & Options Badges**: Select choices via `1`–`4` or `A`–`D`, navigate questions with `ArrowLeft`/`ArrowRight`, and toggle flags with `F`.
* **Live Auto-Save Sync Pill**:
  * Prominent header indicator (`Saved` / `Saving...` / `Saved locally`) providing students immediate visual peace of mind.
* **Pre-Submission Review Modal**:
  * Summarizes answered, unanswered, and flagged questions.
  * Warns students if questions remain unattempted and provides a one-click **"Jump to First Unanswered Question"** shortcut.
* **Bulletproof Offline Resilience**:
  * Instant local caching for 100% zero-data-loss protection during network dropouts.
  * Automatic synchronization upon network reconnection.
  * Emergency offline submission recovery modal with downloadable encrypted backup proof (`.json`).
* **Student Dashboard**:
  * Filter active, upcoming, and completed assessments with instant search.
  * Real-time deadline countdown badges (`Closes in 45m!`, `Closes in 3h`, `Due tomorrow`, `Expired`).

---

### 👨‍🏫 2. Faculty Quiz Builder & Assessment Management
* **Draft Auto-Save & Recovery**:
  * Continuous debounced draft persistence in browser storage for both new quiz creation and quiz editing.
  * Seamless recovery when navigating away (e.g., checking rosters or classes) with a top banner to **Keep Working** or **Discard Draft / Revert Edits**.
* **Rich Question Support**:
  * **Multiple Choice**: Standard multi-option single select.
  * **True / False**: Fast binary answer format.
  * **Short Answer / Identification**: Case sensitivity toggle, synonym management, and configurable fuzzy matching thresholds.
  * **Section Guidelines / Instruction Cards**: Unscored rich text notes for test directions and reading comprehension passages.
* **Questionnaire Document (.docx) & Paste Import**:
  * Auto-detects questions, choices, answers, and section directions from Word documents or raw text paste.
  * Interactive preview modal allowing bulk and per-item question type reclassification.
* **Answer Key Matching**:
  * Upload answer key documents or paste answer keys to automatically populate correct answers across the question set.
* **Smart Proctoring & Rules Assistant**:
  * Quick presets (Relaxed, Balanced, Strict Anti-Cheating) to configure strike limits, shuffle orders, and time restrictions with a single click.

---

### 📊 3. Live Gradebook, Analytics & Integrity Audit
* **Class Performance Scorecards**:
  * Live KPI cards showing Total Submissions, Completion Rate, Average Score, Mean Grade, Highest & Lowest Score, and Passing Rate ($\ge 75\%$).
* **Real-Time Proctoring Telemetry**:
  * Comprehensive log of student infraction strikes and timestamps.
* **Interactive Table Controls**:
  * Clickable column headers to sort ascending/descending by Student ID, Name, Score, Percentage, Violations, or Submission Date.
  * Quick filter pills: **All**, **Submitted**, **In Progress**, **Not Started**, and **Flagged Strikes**.
* **Attempt Resetting**:
  * Ability for teachers and admins to reset a student's attempt to allow a legitimate retake in case of approved technical issues.
* **Gradebook Export**:
  * One-click download of student results in formatted Excel (`.xlsx`) spreadsheets.

---

### 🏫 4. Class & Roster Management
* **Multi-Tenant Course Sections**:
  * Dedicated class codes and course titles with teacher-level isolation.
* **Class List Importer**:
  * Bulk import students from Excel / CSV files with automated ID formatting, duplicate removal, and validation.
* **Quick Tools**:
  * One-click **"Copy All IDs"** to copy enrolled student numbers to clipboard for quick roster verification.
  * Strict enrollment checks ensuring only registered student IDs can enter exams.

---

### 🛡️ 5. Security & Administration
* **Google OAuth & Approval Workflow**:
  * Teacher authentication via Google OAuth with developer administrator approval required prior to accessing faculty tools.
  * Seamless, flicker-free background approval polling and real-time automatic logout for deleted teacher accounts.
* **HMAC-SHA256 Signed Student Sessions**:
  * Cryptographically signed student tokens with timing-safe validation preventing credential tampering.
* **Production Database & Indexes**:
  * Optimized schema with high-concurrency database indexes for high-volume exam submissions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Server Actions, API Routes) |
| **UI Library** | [React 19](https://react.dev/), [Tailwind CSS 3](https://tailwindcss.com/) |
| **Icons & Design** | [Lucide React](https://lucide.dev/), Flat Minimalist Design System |
| **Database & ORM** | [Prisma ORM 6](https://www.prisma.io/), [PostgreSQL](https://www.postgresql.org/) / [TiDB Cloud](https://tidbcloud.com/) |
| **Authentication** | [NextAuth.js 4](https://next-auth.js.org/) (Google Provider) + HMAC-SHA256 Student Tokens |
| **Document Parsers** | [Mammoth.js](https://github.com/mwilliamson/mammoth.js) (.docx), [SheetJS (XLSX)](https://sheetjs.com/) |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.18.0 or newer
* **npm** or **pnpm**
* **PostgreSQL** or **TiDB Cloud / MySQL** database

### 1. Clone & Install
```bash
git clone https://github.com/dxlmartin00/WebQuiz.git
cd WebQuiz
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):

```env
# Database Connection (PostgreSQL or TiDB)
DATABASE_URL="postgresql://user:password@host:5432/webquiz?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-random-nextauth-secret"

# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Student Session Security
STUDENT_JWT_SECRET="your-secure-hmac-sha256-student-secret"
```

### 3. Database Initialization
```bash
# Push Prisma schema to your database
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Build & Verification Commands

```bash
# Run complete verification (Prisma generate, TypeScript check, Next.js production build)
npm run check

# Standard production build
npm run build

# Start production server
npm run start
```

---

## 👥 Credits & Organization

Developed by the **Aurora Alliance** team. Built for resilient, tamper-resistant digital examinations.
