# CLEAN

A cleaning services marketplace built with Next.js and Supabase. Connects customers with professional cleaners.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database & Auth:** Supabase
- **Styling:** Tailwind CSS
- **Email:** Resend
- **Testing:** Jest + Testing Library

## Roles

| Role | Description |
|------|-------------|
| Customer | Browses cleaners, books cleaning sessions |
| Cleaner | Manages availability, accepts/declines bookings |
| Admin | Reviews cleaner applications, manages users and bookings |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> On Windows, run the dev server directly:
> ```bash
> node node_modules/next/dist/bin/next dev
> ```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
```

## Project Structure

```
app/
├── (auth)/          # Login & registration (customer + cleaner)
├── (customer)/      # Browse cleaners, book sessions, view bookings
├── (cleaner)/       # Dashboard, availability, profile, requests
├── admin/           # Applications, bookings, cleaners, customers, availability
└── api/             # Auth routes
```

## Key Features

- **Cleaner registration** — saves profile to `cleaners` + `cleaner_applications` tables, pending admin approval
- **Availability filtering** — customers only see cleaners available on their selected dates and times
- **Booking validation** — time slot picker shows only slots within the cleaner's availability
- **Admin availability view** — `/admin/availability` shows all cleaners' weekly schedules

## Testing

```bash
npm test
npm run test:watch
```
