# Scroll

An interactive portfolio generator that transforms your CV (DOCX or PDF) into a sleek, glass-morphism web portfolio.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

## Overview

Upload a CV document and Scroll automatically parses it into structured sections — profile, experience, skills, education, projects, and more — then renders everything as a polished single-page portfolio with smooth scroll navigation.

## Features

- **Smart CV Parsing** — Supports DOCX (via Mammoth) and PDF (via unpdf) with font-based heading detection and keyword fallback
- **Dynamic Sections** — Portfolio sections are built from your CV data. Unrecognized headings automatically become custom sections
- **Glass-Morphism UI** — Semi-transparent cards with backdrop blur, subtle glows, and accent-colored borders on a dark background
- **Accent Color Customization** — Choose from 8 color themes (Cyan, Emerald, Violet, Rose, Amber, Blue, Pink, Teal)
- **Smooth Scroll Navigation** — Fixed side navigation with animated dots that track the active section
- **Seeding Animation** — Terminal-style loading animation after upload before the portfolio reveal
- **Contact Encryption** — Optionally encrypt contact info with a passcode (AES-256-GCM)
- **Admin Password Protection** — Restrict upload and edit access with an optional admin password
- **Framer Motion Animations** — Fade-in, scale, and staggered entry effects throughout

## Sections

| Section | Description |
|---------|-------------|
| Home | Hero with name, initials, and title |
| About | Professional summary |
| Skills | Categorized skill tags with smart merging of small categories |
| Experience | Timeline with company, role, period, and highlights |
| Education | Degree, institution, and year |
| Projects | Expandable cards with tech stack, highlights, and links |
| Personal Information | Contact details (plain or encrypted) |
| AI Build Log | Info about the generated portfolio |
| Custom | Any extra CV sections appear automatically |

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:4200`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Fetch portfolio data |
| GET | `/api/auth-status` | Check password/passcode status |
| POST | `/api/upload` | Upload and parse a CV |
| POST | `/api/edit` | Edit portfolio fields |
| POST | `/api/reveal-contact` | Decrypt contact info |
| POST | `/api/set-admin-password` | Set or change admin password |
| POST | `/api/set-contact-passcode` | Set or change contact passcode |

## Tech Stack

| Layer | Tools |
|-------|-------|
| Frontend | React 18, TypeScript, Tailwind CSS 4, Framer Motion |
| Routing | React Router |
| Build | Vite |
| CV Parsing | Mammoth (DOCX), unpdf (PDF), Cheerio (HTML) |
| Backend | Azure Functions (production), Vite middleware (dev) |
| Storage | Azure Blob Storage |
| Security | SHA-256 (admin password), AES-256-GCM (contact encryption) |
