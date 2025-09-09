# Free Deployment Guide

## 🆓 Deploy Video QA Application for FREE

This guide will help you deploy both frontend and backend completely free using Vercel and Railway.

### Prerequisites
- Git repository (GitHub, GitLab, or Bitbucket)
- Vercel account (free)
- Railway account (free with $5 monthly credit)

---

## 🎨 Frontend Deployment (Vercel - FREE)

### Step 1: Prepare Frontend
1. Ensure your code is in a Git repository
2. Make sure `.env.production` has the correct backend URL

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your Git repository
4. Set these configurations:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Environment Variables
In Vercel dashboard, add environment variable:
- **Name**: `VITE_API_BASE_URL`
- **Value**: Your Railway backend URL (get this after backend deployment)

---

## 🚀 Backend Deployment (Railway - FREE)

### Step 1: Deploy to Railway
1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `backend` folder as root

### Step 2: Environment Variables
In Railway dashboard, add these variables:
```
REDIS_URL=redis://red-xxxxxxxxxx:6379
FLASK_ENV=production
PORT=5000
```

### Step 3: Add Redis Service
1. In your Railway project, click "New Service"
2. Select "Database" → "Redis"
3. Copy the connection URL to `REDIS_URL` variable

### Step 4: Custom Domain (Optional)
Railway provides a free subdomain like: `your-app-name.up.railway.app`

---

## 🔧 Alternative: Render (Completely FREE)

If you prefer 100% free with no credits:

### Backend on Render
1. Go to [render.com](https://render.com)
2. Create "New Web Service"
3. Connect your repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`

### Add Redis on Render
1. Create "New Redis" instance (free tier)
2. Use the internal Redis URL in environment variables

---

## 📝 Step-by-Step Deployment

### 1. Deploy Backend First
```bash
# Push your code to GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy on Railway/Render
- Follow backend deployment steps above
- Note down the backend URL (e.g., `https://your-app.up.railway.app`)

### 3. Update Frontend Environment
Update `frontend/.env.production`:
```
VITE_API_BASE_URL=https://your-actual-backend-url.up.railway.app
```

### 4. Deploy Frontend to Vercel
- Follow frontend deployment steps above
- Add the backend URL as environment variable

### 5. Test Your Application
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.up.railway.app/api/health`

---

## 💰 Cost Breakdown (FREE!)

### Vercel (Frontend)
- ✅ **FREE** forever for personal projects
- ✅ 100GB bandwidth per month
- ✅ Custom domains included
- ✅ Automatic HTTPS

### Railway (Backend)
- ✅ **$5 credit** per month (enough for small apps)
- ✅ Includes databases (Redis, PostgreSQL)
- ✅ Custom domains
- ✅ Automatic deployments

### Render Alternative (Backend)
- ✅ **Completely FREE** tier
- ✅ 750 hours/month (enough for always-on)
- ✅ Free Redis instance
- ⚠️ Sleeps after 15 minutes of inactivity

---

## 🔧 Optimization for Free Tiers

### Railway Optimization
- Use sleep mode when inactive
- Optimize worker processes (1-2 workers)
- Set reasonable timeouts

### Render Optimization
- App sleeps after 15 minutes (first request may be slow)
- Use keep-alive services if needed

---

## 🚨 Limitations on Free Tiers

### Railway
- $5 credit per month (usually enough)
- No credit card required
- Sleeps when credit runs out

### Render
- App sleeps after 15 minutes
- Cold start delay (10-30 seconds)
- 750 hours per month limit

### Vercel
- No limitations for static sites
- Serverless functions have execution limits

---

## 📞 Need Help?

If you encounter issues:
1. Check deployment logs in Railway/Render dashboard
2. Verify environment variables are set correctly
3. Test backend health endpoint: `/api/health`
4. Check CORS settings for cross-origin requests

**Total Cost: $0/month** (Railway's $5 credit is free!)