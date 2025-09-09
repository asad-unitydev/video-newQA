@echo off
echo 🚀 Deploying Video QA App to FREE hosting...
echo.

echo 📋 Prerequisites Check:
echo ✅ Git repository ready
echo ✅ Vercel account created
echo ✅ Railway/Render account created
echo.

echo 🎯 Step 1: Deploy Backend to Railway (FREE)
echo 1. Go to https://railway.app
echo 2. Click 'New Project'
echo 3. Connect your GitHub repo
echo 4. Select 'backend' folder
echo 5. Add Redis service
echo 6. Copy the generated URL
echo.

echo 🎨 Step 2: Deploy Frontend to Vercel (FREE)
echo 1. Go to https://vercel.com
echo 2. Click 'New Project'
echo 3. Import your Git repo
echo 4. Set root directory to 'frontend'
echo 5. Add environment variable:
echo    VITE_API_BASE_URL=YOUR_RAILWAY_BACKEND_URL
echo.

echo ✨ Alternative: Use Render (100%% FREE)
echo 1. Go to https://render.com
echo 2. Create Web Service from repo
echo 3. Set root directory to 'backend'
echo 4. Add Redis service
echo 5. Frontend still goes to Vercel
echo.

echo 💰 Total Cost: $0/month
echo 🎉 Your app will be live in ~5 minutes!
echo.

echo 📖 For detailed instructions, see FREE_DEPLOYMENT_GUIDE.md

pause