# 🔧 Force Clean Build on Vercel - Step-by-Step Guide

## Problem
Vercel is serving old "India Post" branding despite source code being updated.

---

## Root Causes Fixed

✅ **Removed:** "India Post Reports Management System" from `web-app/src/index.tsx`  
✅ **Deleted:** `web-app/public/Indiapost_Logo.png` asset  
✅ **Updated:** vercel.json with proper build configuration  

---

## Files Changed

1. `web-app/src/index.tsx` - Removed hardcoded "India Post" text
2. `web-app/public/Indiapost_Logo.png` - Deleted logo asset
3. `vercel.json` (root) - Ensure clean build instructions

---

## Vercel Build Process (Updated)

```json
{
  "buildCommand": "cd web-app && npm install && npm run build",
  "outputDirectory": "web-app/build",
  "installCommand": "npm install --legacy-peer-deps",
  "rewrites": [ ... ]
}
```

**Behavior:**
1. Navigate to web-app directory
2. Fresh install dependencies
3. Run production build (clean webpack output)
4. Output to web-app/build
5. Deploy from build folder

---

## Why This Works

| Step | Before | After |
|------|--------|-------|
| Build | May use old cache | Clean build every time |
| Dependencies | May conflict | --legacy-peer-deps handles conflicts |
| Output | Might be old | Fresh build/ directory |
| Deploy | Old files serve | New files deployed |

---

## Manual Vercel Cleanup Steps

Go to Vercel Dashboard:

### Step 1: Clear Build Cache
1. Project → **Settings**
2. Scroll to **Build Cache**
3. Click **Clear Cache** button
4. Confirm deletion

### Step 2: Force Redeploy
1. Go to **Deployments** tab
2. Find latest deployment
3. Click **Redeploy** button
4. Monitor build logs (should take 2-3 min)

### Step 3: Verify Clean Build
1. Refresh your app URL in browser
2. Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
3. Open DevTools Console (F12)
4. Look for "Reports Management System" (no "India Post")
5. Check that Indiapost_Logo.png is NOT loaded

### Step 4: Test Features
- ✅ Login page loads
- ✅ Dashboard displays
- ✅ No India Post branding visible
- ✅ All features work

---

## If Still Seeing Old Branding

### Browser Cache Issue
```bash
# Clear browser cache
1. F12 → Application tab
2. Click "Clear storage" or "Clear site data"
3. Hard refresh page (Cmd+Shift+R)
```

### CDN Cache Issue
1. Vercel uses edge caching
2. May take up to 1 hour to fully purge
3. Force invalidation:
   - Project → Settings → Deployments
   - Click three dots (…) on deployment
   - Select "Remove" then redeploy

### Verify Build Output
1. Vercel Dashboard → Deployments
2. Click latest deployment
3. View **Build Logs**
4. Should show: "Compiled successfully"
5. Check for any errors or warnings

---

## Expected Results

✅ **"Reports Management System"** displayed (generic)  
✅ **No India Post logos** visible  
✅ **No India Post text** in headers  
✅ **Clean, generic branding** throughout  

---

## Technical Details

### What `npm run build` Does
1. Webpack bundles all React code
2. Minifies and optimizes
3. Creates `build/` folder with:
   - `index.html`
   - `static/js/main.[hash].js` (bundled code)
   - `static/css/main.[hash].css` (bundled styles)
   - Assets from `public/`

### Why Old Files Might Persist
1. Browser caches `main.[hash].js` for long time
2. Old hash names not deleted
3. Service Worker might cache old versions
4. CDN edge nodes still serving old version

### How Fix Ensures Clean Deploy
1. Build folder completely rebuilt
2. New hash generated for all files
3. Old files not referenced
4. Browser downloads new bundle with new hash

