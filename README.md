# Alianah Humanity Welfare

A comprehensive donation management platform for Alianah Humanity Welfare.

## Features

- **Donation Management**: Track one-time and recurring donations
- **Appeal Management**: Create and manage fundraising appeals
- **Water Projects**: Manage water wells, pumps, tanks, and wudhu areas
- **Fundraising Pages**: Allow supporters to create their own fundraising pages
- **Admin Dashboard**: Comprehensive analytics and reporting
- **Email Notifications**: Automated emails via Resend
- **File Storage**: Secure file uploads via Vercel Blob
- **Payment Processing**: Stripe integration for secure payments

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI / shadcn/ui
- **Email**: Resend
- **File Storage**: Vercel Blob
- **Payments**: Stripe
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Neon recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/auroradigitaluk/alianah.git
   cd alianahapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Then fill in all the required values (see `.env.example` for details)

4. **Set up the database**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. **Seed the database** (optional)
   ```bash
   npm run db:seed
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Setup

For detailed production setup instructions, see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)

Quick checklist:
- [ ] Set up Neon database
- [ ] Configure Resend for emails
- [ ] Set up Vercel Blob for file storage
- [ ] Configure Stripe for payments
- [ ] Add all environment variables to Vercel
- [ ] Deploy to Vercel

## Environment Variables

See `.env.example` for a complete list of required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `RESEND_API_KEY` - Resend API key for emails
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token for file uploads
- `STRIPE_SECRET_KEY` - Stripe secret key for payments

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed the database
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
alianahapp/
├── app/                    # Next.js app directory
│   ├── (public)/           # Public routes
│   ├── admin/              # Admin dashboard routes
│   └── api/                # API routes
├── components/             # React components
├── lib/                    # Utility functions
├── prisma/                 # Prisma schema and migrations
└── public/                 # Static assets
```

## Database Schema

The database schema is defined in `prisma/schema.prisma`. Key models:

- `AdminUser` - Admin users
- `Appeal` - Fundraising appeals
- `Donation` - Donations
- `Donor` - Donor information
- `Fundraiser` - Fundraising pages
- `WaterProject` - Water projects
- `Product` - Products for sale

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private - All rights reserved

## Support

For issues or questions, please contact the development team.
