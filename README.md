# NetPlex ISP Management Dashboard

## Quick Setup

### 1. Backend
```bash
cd backend
cp .env.example .env
# Fill in .env with your DATABASE_URL and JWT_SECRET
npm install
# Setup DB: psql -d your_db < src/db/schema.sql
npm start
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to your backend URL
npm install
npm run dev
```

### 3. Deploy Free

**Backend (Railway):**
1. Push to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variables (DATABASE_URL, JWT_SECRET, FRONTEND_URL)

**Frontend (Vercel):**
1. Go to vercel.com → New Project → Import from GitHub
2. Set VITE_API_URL to your Railway backend URL
3. Deploy

### Default Login
- Username: admin
- Password: admin123 ← Change this immediately!

## Features
- Multi-profile bot management
- WhatsApp connection status
- AI knowledge source (Google Sheet / Manual)
- Auto-forward destinations
- Conversation logs with search
- Human takeover per conversation
- Records/Complaints tracker (relabels per niche)
- Pending admin actions queue
- Blacklist management
- Bulk marketing
- AI learned knowledge database
- JWT authentication
