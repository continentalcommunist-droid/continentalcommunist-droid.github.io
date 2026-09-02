---
layout: page
title: Privacy Policy
description: Privacy policy and data practices for Continental Communist, detailing our commitment to privacy, learner accounts, local storage, and third-party services.
permalink: /privacy/
schema_page_type: WebPage
updated: 2026-09-02
---

**Continental Communist is an independent publication dedicated to education, political economy, and materialist analysis. We believe privacy and intellectual freedom are essential conditions for independent study.**

This Privacy Policy explains what information is collected when you visit [continentalcommunist.com](https://www.continentalcommunist.com), how that information is used, and how your data is protected.

## Principles

1. **Free and open curriculum.** All learning pathways, lecture guides, discussion prompts, syllabi, bibliographies, and reference glossaries are 100% free and open without requiring an account. Reading full published analytical articles and accessing on-site digital library books requires creating a free learner account.
2. **No surveillance advertising.** We do not sell user data, run third-party advertising networks, deploy tracking pixels, or monetize your reading habits.
3. **Private by design.** Educational progress and personal notes belong to the learner. Features that track pathway completion store data locally on your device by default. Cloud synchronization is entirely optional.
4. **Owner-only database policies.** When you choose to create a learner account, strict row-level security policies ensure your records, bookmarks, and private study notes can only be accessed by you.

## Information We Collect

### 1. Anonymous Browsing and Local Storage

When you explore the site and study learning pathways without creating an account:

- We do not require registration, email addresses, or personal identifiers.
- You can freely access course overviews, syllabi, lecture guides, discussion questions, timelines, and glossary references.
- If you check off completed steps in learning pathways, this progress is stored directly in your browser's local storage (`localStorage`). This data stays on your machine and is never transmitted to our servers or third parties.
- You can clear your local progress at any time through your browser settings.

### 2. Learner Accounts

Creating a free learner account unlocks access to full analytical articles, primary source texts, and digital library book editions, while enabling optional cross-device synchronization for pathway progress, bookmarks, and private research notes. We collect only the minimal data required to provide this service:

- **Account credentials:** Your email address and a cryptographically hashed password (managed securely through our authentication provider, Supabase).
- **Profile information:** A chosen display name and optional time zone for study schedules and reminders.
- **Learner records:** Pathway enrollments, completed pathway steps, bookmarks you add to your reading queue, and private research notes you compose.

We do not collect browsing history, click streams, or public profiles.

### 3. Third-Party Authentication (Sign in with Google)

If you choose to sign in using Google OAuth:

- Google verifies your identity and provides your name and verified email address.
- We do not access your Google contacts, drive, browsing history, or any other Google account data.
- You can revoke this site's access at any time through your [Google Account security settings](https://myaccount.google.com/permissions).

## How We Protect Your Data

- **Row-Level Security (RLS):** All learner profiles, pathway enrollments, progress markers, bookmarks, and notes are stored in dedicated database tables protected by database-level Row Level Security policies. Even in the public client application, no learner can read, update, or delete another learner's records.
- **Encryption:** All network communication is encrypted in transit via HTTPS/TLS. Passwords and credentials are cryptographically protected and never stored in plain text.
- **Service Isolation:** Public site code operates strictly with unprivileged public keys. Administrative and service-role database keys are never exposed to the client.

## Third-Party Services and Infrastructure

To deliver a fast, reliable, and secure platform, we utilize a small number of infrastructure providers:

- **Hosting (GitHub Pages):** The static website is hosted on GitHub Pages. GitHub may record standard server connection logs (such as IP addresses, browser user-agent headers, and request timestamps) for security, abuse prevention, and network operations in accordance with the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement).
- **Learner Database & Authentication (Supabase):** Account authentication, session management, and encrypted data storage are provided by Supabase. Supabase complies with modern data protection standards and processes data in accordance with its privacy terms.
- **Content Delivery Networks (CDNs):** Open-source runtime libraries (such as the Supabase client and PDF reader scripts) may be loaded via reputable CDNs (e.g., jsDelivr). These CDNs receive standard network requests necessary to serve static asset files.

We do not use third-party analytics trackers, behavioral ad cookies, or cross-site tracking scripts.

## Cookies and Browser Storage

- **Essential Cookies and Local Storage:** We use local browser storage and session cookies solely for essential functionality: preserving your login session when you sign in, remembering active pathway progress, and caching your study preferences.
- **No Advertising Cookies:** We do not set any tracking, targeting, or advertising cookies.

## Your Rights and Data Control

You retain complete control over your information:

- **Access and Correction:** You can review and update your display name and time zone at any time on your [Learner Dashboard](/account/).
- **Data Deletion:** You can delete individual bookmarks and private notes directly from your dashboard. If you wish to delete your entire learner account and all associated records, you may submit a request at any time.
- **Export and Portability:** Because all reading materials, source texts, and pathways are public, you may freely download, save, or copy your personal study notes and records at will.

## Children's Privacy

Continental Communist provides educational resources for general audiences. We do not knowingly collect personal identifiable information from children under 13. If you believe a child has created an account without parental consent, please contact us so we can remove the account.

## Changes to This Policy

We may update this Privacy Policy from time to time to reflect changes in our technical architecture, features, or applicable legal standards. Any revisions will be published on this page with an updated modification date.

## Contact Us

If you have questions, concerns, or data requests regarding this Privacy Policy or our data practices, please contact us:

- **Publication:** Continental Communist
- **Website:** [continentalcommunist.com](https://www.continentalcommunist.com)
- **Account Dashboard:** [/account/](/account/)
