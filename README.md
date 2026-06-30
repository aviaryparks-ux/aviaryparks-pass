# Aviary Park Pass 

**Aviary Park Pass** is a next-generation theme park management and ticketing system featuring Touchless AI Entry (Facial Recognition). This system is designed to eliminate physical queues, prevent ticket fraud, and provide seamless access for visitors.

## Key Features
- **Touchless Entry (Face Recognition):** Powered by Deep Learning (ResNet-34) and pgvector database for sub-second face matching.
- **Family Registration System:** One transaction can enroll multiple family members.
- **Admin Dashboard & Analytics:** Real-time monitoring of park visits, active members, and top active visitors.
- **High Security:** No raw face photos are stored. Only mathematical vectors (128-d) are saved using Encrypted at Rest databases.

## Technology Stack
- **Frontend:** Next.js 14, React, TypeScript, TailwindCSS
- **Backend/API:** Next.js Route Handlers (Edge & Node)
- **Database:** Supabase (PostgreSQL 15), pgvector
- **AI Models:** face-api.js (Browser-based preprocessing)
- **Deployment:** Vercel

## Local Development
First, install all dependencies:
```bash
npm install
```

Set up your `.env.local` file with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Proprietary Software
This source code is strictly confidential and is the intellectual property of Aviary Park Management. Unauthorized copying, distribution, or deployment is prohibited.
