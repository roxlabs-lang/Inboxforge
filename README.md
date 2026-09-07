# INBOXFORGE

> **Finite Mathematical Gmail Dot-Placement Identity & Testing Workspace**  
> Local-First • Zero-Credentials Security Model • Multi-Threaded Web Worker Generation • IndexedDB Persistence

---

## ⚡ Overview

**InboxForge** is a production-grade, local-first email identity generation and QA testing platform designed for developers, security researchers, and test engineers.

When given a central Gmail mailbox that you control (e.g. `yourname@gmail.com`), Gmail routes all variations with dots (`y.ourname@gmail.com`, `you.r.name@gmail.com`) to the exact same central inbox. 

InboxForge deterministically generates the **complete finite mathematical space** of $2^{N-1}$ Gmail dot-placement address variants, stores and indexes them entirely within client-side IndexedDB, organizes them into testing projects, and provides local mock authentication and API probing tooling.

---

## 🔒 Security & Privacy Guarantee (Zero Credentials)

InboxForge operates under a strict **Zero-Credentials Security Model**:
- **Never requests or handles**: Gmail passwords, Google credentials, session cookies, OAuth tokens, recovery codes, or 2FA secrets.
- **100% Client-Side Storage**: All identities, labels, test cases, and simulation logs are stored strictly inside your browser's local **IndexedDB** database.
- **Zero External Telemetry**: No emails, test data, or payloads are sent to any remote server.

---

## 📐 Mathematical Formulation

For any Gmail mailbox username of length $N$:
- There are $N-1$ gap positions between characters where a dot (`.`) may or may not be inserted.
- Each gap position is a binary choice: `0` (no dot) or `1` (dot).
- The total finite space of dot-placement variations is strictly:

$$\text{Total Variants} = 2^{N-1}$$

For example:
- `abc@gmail.com` ($N=3$) $\rightarrow 2^{3-1} = 4$ combinations (`abc`, `a.bc`, `ab.c`, `a.b.c`)
- `alexander@gmail.com` ($N=9$) $\rightarrow 2^{9-1} = 256$ combinations
- `demodeveloper@gmail.com` ($N=14$) $\rightarrow 2^{14-1} = 8,192$ combinations

The generation engine uses zero-memory-footprint bitwise shift logic (`BigInt(1n << (N-1))`) with multi-threaded Web Workers, streaming chunks directly to IndexedDB.

---

## ✨ Features

1. **Base Mailbox Onboarding & Workspace Manager**:
   - Multi-workspace support with strict Gmail/Googlemail address validation.
   - Live mathematical finite space preview and statistics.

2. **Multi-Threaded Generation Engine (`generator.worker.ts`)**:
   - Asynchronous Web Worker streaming to prevent UI thread lock.
   - Chunked batch IndexedDB ingestion with pause, resume, cancel, and crash recovery checkpoints.

3. **High-Scale Virtualized Identity Explorer**:
   - 60 FPS virtual windowing rendering thousands of records without DOM bloat.
   - Comprehensive status tracking (`unused`, `reserved`, `used`, `archived`).
   - Inline notes editing with autosave.
   - Instant click-to-copy with feedback badges.

4. **Multi-Selection & Bulk Operations**:
   - Bulk Copy, Bulk Star/Unstar, Bulk Status change, Bulk Delete, Bulk Tag, and Bulk Export.

5. **Projects & Test Case Manager**:
   - Organize identities into test suites.
   - Track expected vs. actual outcomes with automated test flow execution.

6. **OTP & Verification Inbox**:
   - Manually record and search verification codes and OTPs for testing identities.
   - One-click copy with expiration tracking.

7. **Local Test Lab & Auth Simulator**:
   - Interactive 3-step mock authentication simulator (Signup $\rightarrow$ OTP $\rightarrow$ Login).
   - Custom HTTP / API probe console with status and body assertion.
   - 5-step automated workflow runner.

8. **Storage, Backups & Migration**:
   - Full workspace state backup and restore in JSON.
   - Export identities to TXT (emails only), CSV (with metadata), or JSON.
   - Ingest existing lists with automated normalization and duplicate prevention.

9. **Performance Diagnostics & Live Correctness Suite**:
   - Live IndexedDB quota and storage analysis.
   - Built-in live unit test suite verifying mathematical correctness and set uniqueness.

---

## 🚀 Getting Started

### Development
```bash
# Start development server on port 3000
npm run dev
```

### Production Build
```bash
# Build optimized production bundle
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + K` / `Cmd + K` | Focus Identity Search Input |
| `Ctrl + G` / `Cmd + G` | Open Variant Generator Modal |
| `Esc` | Clear Selection / Dismiss Floating Bars |
| `Ctrl + C` / `Cmd + C` | Copy Selected Identities |
