# A Toast to You - Replit.md

## Overview

"A Toast to You" is a motivational web application that helps users maintain daily reflection habits through personalized AI-generated audio toasts. The app enables users to record daily thoughts and reflections, then generates weekly personalized audio messages that celebrate their insights and encourage continued growth.

## System Architecture

### Full-Stack JavaScript Application
The application follows a modern full-stack architecture:

**Frontend:** React with TypeScript, Vite build system, Tailwind CSS for styling, and shadcn/ui components
**Backend:** Express.js with TypeScript, RESTful API design
**Database:** PostgreSQL with Drizzle ORM for type-safe database operations
**Authentication:** Passport.js with local strategy and social authentication (Google/Apple via Supabase)
**File Storage:** Supabase Storage for audio files with local fallback
**AI Services:** OpenAI for text generation and transcription, ElevenLabs for text-to-speech (with OpenAI TTS fallback)

## Key Components

### Authentication System
- Local authentication with username/password
- Social authentication via Google/Apple through Supabase
- JWT token-based session management
- Email verification system with Resend
- Rate limiting for login attempts
- Password reset functionality

### Reflection Management
- Daily note creation with text or audio input
- Audio transcription using OpenAI Whisper
- Note history and retrieval by date ranges
- Bundle tagging system for grouping related reflections

### Toast Generation
- AI-powered weekly toast generation using OpenAI GPT-4
- Multiple voice options via ElevenLabs TTS
- Fallback to OpenAI TTS when ElevenLabs credits are exhausted
- Timezone-aware scheduling for personalized delivery times
- User preference system for voice style and delivery day

### Gamification Features
- Badge system for milestone achievements
- User activity tracking and analytics
- Streak counters and progress visualization
- Social features for sharing toasts and reactions

### Social Features
- Friend system with requests and status management
- Toast sharing with customizable privacy settings
- Comments and reactions on shared toasts
- Public sharing via unique codes

## Data Flow

### Note Creation Flow
1. User creates reflection via text input or audio recording
2. Audio files are transcribed using OpenAI Whisper
3. Content is stored in PostgreSQL with user association
4. Audio files are uploaded to Supabase Storage
5. Achievement system checks for badge eligibility

### Toast Generation Flow
1. Scheduled job identifies users due for toast generation
2. System retrieves user's recent reflections within date range
3. OpenAI GPT-4 generates personalized toast content
4. Text is converted to speech using ElevenLabs or OpenAI TTS
5. Audio file is stored and toast record is created
6. User receives notification of new toast availability

### Authentication Flow
1. User authenticates via local credentials or social provider
2. JWT token is generated and stored in HTTP-only cookie
3. Middleware validates token for protected routes
4. User session is maintained across requests

## External Dependencies

### Required Services
- **PostgreSQL Database:** Primary data storage (via DATABASE_URL)
- **OpenAI API:** Text generation and audio transcription (OPENAI_API_KEY)
- **Supabase:** Social authentication and file storage (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY)

### Optional Services
- **ElevenLabs:** Premium text-to-speech (ELEVENLABS_API_KEY)
- **Resend:** Email notifications (RESEND_API_KEY)
- **SendGrid:** Alternative email service (SENDGRID_API_KEY)

### Key Environment Variables
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_KEY=eyJhbGciOi...
JWT_SECRET=your-secret-key
RESEND_API_KEY=re_...
ELEVENLABS_API_KEY=...
```

## Deployment Strategy

### Development Environment
- Uses Vite dev server for frontend with HMR
- Express server with TypeScript compilation via tsx
- Database migrations via Drizzle Kit
- Local file storage fallback when Supabase unavailable

### Production Environment
- Vite builds frontend to static assets
- Express server bundled via esbuild
- Static file serving for audio and voice samples
- Automatic database migrations on deployment

### Database Management
- Schema defined in `shared/schema.ts` using Drizzle ORM
- Migrations managed via `drizzle-kit push`
- Initial data seeding for badges and voice samples
- Connection pooling via Neon serverless driver

### Monitoring and Logging
- Structured logging for API requests and errors
- Rate limiting and abuse protection
- WebSocket support for real-time features (currently disabled)
- Testing mode for development and debugging

## Changelog
- July 02, 2025. Set Australia/Perth as default timezone for all users (new and existing)
- July 02, 2025. Fixed ElevenLabs credit detection system to correctly show available credits
- July 02, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.