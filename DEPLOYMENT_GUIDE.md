# Surveillance Log QC Tool — Deployment Guide
### Completely free setup. No credit card required.

---

## What you'll need
- A computer with a web browser
- A Google account (Gmail counts)
- About 20 minutes

---

## PART 1 — Get your free Google Gemini API key
*(This is the AI that powers the QC reviews. Google offers it free with no credit card.)*

1. Go to **https://aistudio.google.com**
2. Sign in with your Google account
3. Click **"Get API Key"** in the top left
4. Click **"Create API key"**
5. Select **"Create API key in new project"**
6. **Copy the key** — it looks like a long string of letters and numbers
   ⚠️ Save this somewhere safe like a notes app — you'll need it in Part 4

---

## PART 2 — Create a free GitHub account
*(GitHub stores your app files. It's free and no credit card needed.)*

1. Go to **https://github.com** and click **Sign Up**
2. Follow the steps to create a free account
3. Verify your email when prompted

---

## PART 3 — Upload the app files to GitHub

1. Once logged in to GitHub, click the **+** icon (top right corner) → **"New repository"**
2. Name it exactly: `surveillance-qc`
3. Make sure **"Public"** is selected
4. Click **"Create repository"**
5. On the next page, click **"uploading an existing file"**
6. Unzip the folder you downloaded and drag ALL the files into the upload area.
   The files should look like this when uploaded:
   ```
   vercel.json
   package.json
   api/
     qc.js
   public/
     index.html
   ```
   ⚠️ Important: the `api` and `public` folders must stay as folders — don't flatten everything into one level
7. Scroll down and click **"Commit changes"**

---

## PART 4 — Deploy on Vercel (free hosting)
*(Vercel gives your app a web address your team can visit. Free forever for this use case.)*

1. Go to **https://vercel.com** and click **Sign Up**
2. Choose **"Continue with GitHub"** and click **Authorize**
3. Click **"Add New Project"**
4. Find `surveillance-qc` in the list and click **"Import"**
5. Don't change any settings — scroll down and click **"Deploy"**
6. Wait about 60 seconds. You'll see a ✅ success screen with a URL like:
   `https://surveillance-qc-yourname.vercel.app`
   — but don't share it yet, one more step first!

---

## PART 5 — Add your API key (keeps it secret and secure)
*(Your API key goes here — not in the files — so it's never visible to anyone using the app.)*

1. In Vercel, go to your project dashboard
2. Click **"Settings"** tab at the top
3. Click **"Environment Variables"** in the left menu
4. Click **"Add"**
5. In the **Key** field type exactly: `GEMINI_API_KEY`
6. In the **Value** field, paste your API key from Part 1
7. Click **"Save"**
8. Now click **"Deployments"** in the top menu
9. Click the three dots **"..."** next to the most recent deployment → **"Redeploy"** → confirm

---

## PART 6 — Share with your team 🎉

Your app is now live and free! Share the Vercel URL with your investigators.

They just open it in any browser — **no login, no install, no account needed.**

**Optional: Custom URL**
If you want a cleaner address like `qc.youragency.com`, go to Vercel → Settings → Domains and follow the instructions. This is free if you already own a domain.

---

## Free tier limits

Google's free Gemini tier allows:
- **1,500 QC reviews per day**
- **1 million tokens per minute**

This is far more than a typical PI agency will ever use. If you somehow hit the limit, reviews will return an error temporarily and work again the next day.

---

## Troubleshooting

| Problem | What to try |
|---|---|
| "API key not configured" error | Redo Part 5 — make sure the key name is exactly `GEMINI_API_KEY` and you redeployed after saving |
| Page loads but nothing happens | Make sure `api/qc.js` is inside a folder called `api`, not at the top level |
| Blank white page | Make sure `index.html` is inside a folder called `public` |
| "Could not detect any days" | Make sure each day in the report starts with the words `Date of Surveillance:` |
| Still not working | Delete the project on Vercel, re-upload files to GitHub, and start Part 4 again |

---

## Updating the QC rules later

If you ever need to change what the AI looks for or fixes:
1. Go to GitHub → your `surveillance-qc` repository
2. Click on `api` folder → click `qc.js`
3. Click the pencil ✏️ icon to edit
4. Find the `SYSTEM_PROMPT` section and make your changes
5. Click **"Commit changes"**
6. Vercel will automatically update the live app within about 30 seconds

---

*Built for your agency — powered by Google Gemini (free tier)*
