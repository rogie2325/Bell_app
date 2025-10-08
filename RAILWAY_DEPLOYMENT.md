# 🚂 Railway Deployment Guide - ASAP Edition

## 🚀 Get Your App Live in 10 Minutes

---

## Step 1: Push Your Code to GitHub (2 minutes)

```bash
# Make sure all changes are committed
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

---

## Step 2: Sign Up for Railway (1 minute)

1. Go to **[railway.app](https://railway.app)**
2. Click **"Login"**
3. Sign in with **GitHub** (easiest option)
4. Authorize Railway to access your repositories

---

## Step 3: Create New Project (3 minutes)

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **`Bell_app`** from the list
4. Railway will automatically detect:
   - ✅ Node.js project
   - ✅ `railway.json` config
   - ✅ Build and start commands

---

## Step 4: Add Environment Variables (2 minutes)

**CRITICAL:** Your app needs LiveKit credentials to work!

1. In Railway dashboard, click on your project
2. Go to **"Variables"** tab
3. Click **"Add Variable"** and add these:

```
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_SECRET=your_livekit_secret_key
LIVEKIT_URL=wss://your-project.livekit.cloud
NODE_ENV=production
PORT=3001
```

### Where to Get LiveKit Credentials:

1. Go to [livekit.io](https://livekit.io)
2. Sign in to your dashboard
3. Copy your **API Key** and **API Secret**
4. Copy your **WebSocket URL** (starts with `wss://`)

---

## Step 5: Deploy! (2 minutes)

1. Click **"Deploy"** (Railway does this automatically after adding variables)
2. Wait for build to complete (watch the logs)
3. You'll see: ✅ **Build successful**
4. Click on your deployment to get the **public URL**

Your app will be live at: **`https://your-app.up.railway.app`**

---

## 🎉 You're Live! What Now?

### Test Your Deployment:

1. Visit your Railway URL
2. Create a room
3. Share the link with friends
4. Test the "Pass the Aux" feature!

### Update Your App:

```bash
# Make changes locally
code .

# Commit and push
git add .
git commit -m "Updated feature"
git push

# Railway auto-deploys in ~2 minutes!
```

---

## 🔧 Troubleshooting

### Build Failed?

**Check the build logs:**
- Click on your deployment
- View **"Build Logs"**
- Look for error messages

**Common fixes:**
- Make sure all dependencies are in `package.json`
- Verify `npm run build` works locally
- Check Node.js version (Railway uses latest)

### App Won't Start?

**Check deployment logs:**
- View **"Deploy Logs"**
- Look for missing environment variables
- Verify LiveKit credentials are correct

**Test locally first:**
```bash
npm run build
npm start
```

### Can't Connect to LiveKit?

- Double-check `LIVEKIT_URL` format: `wss://your-project.livekit.cloud`
- Verify API Key and Secret are correct
- Make sure no extra spaces in environment variables

---

## 💰 Pricing

- **Free Trial:** $5 credit (enough for testing)
- **Hobby Plan:** $5/month (500 hours execution)
- **Pro Plan:** $20/month (more resources)

Your app will likely cost **$5-10/month** with normal usage.

---

## 🎯 Next Steps

### Domain Setup (Optional):
1. Buy a domain (Namecheap, Google Domains, etc.)
2. In Railway, go to **"Settings" → "Domains"**
3. Add your custom domain
4. Update DNS records (Railway provides instructions)

### Monitoring:
- View **"Metrics"** tab for CPU/Memory usage
- Check **"Logs"** for errors
- Set up **"Webhooks"** for deployment notifications

### Scaling:
- Railway auto-scales based on traffic
- Upgrade plan if you hit limits
- Monitor usage in dashboard

---

## 🆘 Need Help?

- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **LiveKit Docs:** [docs.livekit.io](https://docs.livekit.io)
- **Discord Support:** Join Railway's Discord server

---

## ✅ Checklist

Before going live, make sure:

- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] Project deployed
- [ ] Environment variables added
- [ ] LiveKit credentials configured
- [ ] App loads without errors
- [ ] Can create a room
- [ ] Video/audio works
- [ ] Music sharing works
- [ ] Tested on mobile

---

## 🚀 You're All Set!

Your app is now live and accessible from anywhere!

Share your Railway URL and start getting users! 🎉
