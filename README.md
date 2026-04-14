# AI Canvas - Collaborative Spatial Intelligence

A living archive where work, discussion, and history coexist on an infinite plane.

## Features

- **Infinite Collaborative Canvas**: Real-time multiplayer whiteboard with Tldraw
- **AI-Powered Insights**: Automatic summarization, clustering, and tagging
- **Spatial Chat**: Comments anchored to specific locations on the canvas
- **File Management**: Upload and embed images, PDFs, and documents
- **Version History**: Track changes and restore previous states
- **Role-Based Access**: Viewer, Editor, and Admin roles for team collaboration

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Authentication**: Auth.js v5 (NextAuth) with email/password
- **Database**: Neon PostgreSQL with Prisma ORM
- **Real-time**: Liveblocks for multiplayer collaboration
- **AI**: Google Gemini 2.5 Pro, Pinecone vector database
- **Storage**: Vercel Blob for file storage
- **Background Jobs**: Trigger.dev for AI processing
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 20 or later
- PostgreSQL database (Neon recommended)
- Google AI Studio API key
- Liveblocks account
- Pinecone account
- Vercel Blob storage

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-canvas.git
   cd ai-canvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and fill in your values:
   - `AUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `EMAIL_*`: SMTP settings for email verification
   - `GOOGLE_GENERATIVE_AI_API_KEY`: From Google AI Studio
   - `LIVEBLOCKS_SECRET_KEY` and `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`: From Liveblocks
   - `PINECONE_*`: From Pinecone console
   - Other services as needed

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   
   # Optional: Seed database
   # npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Run background jobs (optional)**
   ```bash
   npx trigger.dev@latest dev
   ```

## Deployment on Netlify

### 1. Connect Repository

1. Sign up or log in to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub/GitLab repository

### 2. Configure Build Settings

Netlify will automatically detect Next.js and configure most settings. Verify:

- **Build command**: `prisma generate && prisma migrate deploy && next build`
- **Publish directory**: `.next`
- **Node version**: 20

### 3. Set Environment Variables

In Netlify Dashboard → Site settings → Environment variables, add:

#### Required Variables
```
AUTH_SECRET=your-generated-secret-here
DATABASE_URL=postgresql://username:password@ep-cool-cloud-123456.us-east-2.aws.neon.tech/dbname?sslmode=require&pgbouncer=true
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app
```

#### Authentication & Email
```
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM="AI Canvas <noreply@ai-canvas.com>"
```

#### Liveblocks
```
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_...
LIVEBLOCKS_SECRET_KEY=sk_...
```

#### AI Services
```
GOOGLE_GENERATIVE_AI_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=ai-canvas
PINECONE_ENVIRONMENT=us-east-1
```

#### Storage & Background Jobs
```
BLOB_READ_WRITE_TOKEN=vercel_blob_...
TRIGGER_API_KEY=tr_...
TRIGGER_API_URL=https://api.trigger.dev
```

#### Optional Services
```
SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
HELICONE_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
MEILI_HOST=...
MEILI_MASTER_KEY=...
REDIS_URL=...
```

### 4. Deploy

1. Click "Deploy site" in Netlify
2. Monitor the build process in the Deploys tab
3. Your site will be available at `https://your-site.netlify.app`

### 5. Post-Deployment

1. **Run database migrations** (if not using `prisma migrate deploy` in build):
   ```bash
   npx prisma migrate deploy
   ```

2. **Set up custom domain** (optional):
   - Netlify Dashboard → Site settings → Domain management
   - Add custom domain and follow DNS instructions

3. **Enable HTTPS**: Automatically provided by Netlify

## Database Migration from Railway to Neon

### 1. Export Data from Railway

```bash
# Connect to Railway PostgreSQL
pg_dump -h railway-postgres-host -U railway-user -d railway-db > backup.sql
```

### 2. Import to Neon

```bash
# Connect to Neon PostgreSQL
psql -h neon-host -U neon-user -d neon-db -f backup.sql
```

### 3. Update Connection String

Change `DATABASE_URL` to Neon format:
```
postgresql://username:password@ep-cool-cloud-123456.us-east-2.aws.neon.tech/dbname?sslmode=require
```

For production with connection pooling:
```
postgresql://username:password@ep-cool-cloud-123456-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require&pgbouncer=true
```

## Authentication System

The application uses Auth.js v5 (formerly NextAuth) with:

- **Email/Password authentication**
- **Email verification** for new accounts
- **Password reset** functionality
- **JWT sessions** with secure cookies
- **Prisma adapter** for database storage

### User Management

- Users can sign up with email and password
- Verification emails are sent automatically
- Password reset via email
- Profile management (name, avatar)

## Architecture

### Core Components

1. **Canvas System**: Infinite whiteboard with Tldraw + Liveblocks
2. **AI Janitor**: Background processing with Trigger.dev
3. **Vector Search**: Pinecone for semantic search
4. **File Storage**: Vercel Blob for uploaded assets
5. **Real-time Collaboration**: Liveblocks for multiplayer

### Folder Structure

```
ai-canvas/
├── prisma/           # Database schema
├── src/
│   ├── app/          # Next.js app router
│   │   ├── (auth)/   # Authentication pages
│   │   ├── (dashboard)/ # Main application
│   │   ├── api/      # API routes
│   │   └── layout.tsx
│   ├── components/   # React components
│   ├── lib/          # Utilities & configurations
│   │   ├── auth.ts   # Auth.js configuration
│   │   ├── db.ts     # Prisma client
│   │   └── email.ts  # Email utilities
│   └── triggers/     # Background jobs
├── public/           # Static assets
└── package.json
```

## Development

### Common Tasks

**Run tests**: (Add your test commands here)

**Lint code**:
```bash
npm run lint
```

**Format code**:
```bash
npx prettier --write .
```

**Database management**:
```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Create migration
npx prisma migrate dev --name migration-name
```

### Adding New Features

1. **Database changes**: Update `prisma/schema.prisma`
2. **API endpoints**: Add to `src/app/api/`
3. **UI components**: Add to `src/components/`
4. **Background jobs**: Add to `src/triggers/`

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Verify `DATABASE_URL` is correct
   - Check if Neon instance is running
   - For production, use `?pgbouncer=true` for connection pooling

2. **Authentication issues**:
   - Ensure `AUTH_SECRET` is set and consistent
   - Check email configuration for verification emails
   - Verify CORS settings in production

3. **Build failures on Netlify**:
   - Check Node version compatibility
   - Verify all environment variables are set
   - Increase build timeout if needed (Netlify settings)

4. **Liveblocks connection issues**:
   - Verify API keys are correct
   - Check CORS settings
   - Ensure room IDs follow expected format

### Getting Help

- Check the [Netlify documentation](https://docs.netlify.com/)
- Refer to [Next.js documentation](https://nextjs.org/docs)
- Consult [Auth.js documentation](https://authjs.dev/)
- Review [Liveblocks documentation](https://liveblocks.io/docs)

## License

[MIT](LICENSE)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please ensure your code follows the existing style and includes appropriate tests.