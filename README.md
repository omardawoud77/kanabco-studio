# Kanabco Catalog Studio

A workbench for generating on-brand product photography for Kanabco. Built with Next.js + Supabase + Gemini.

## What this app does

- Drop in any product photo
- Auto-detect what type of Kanabco product it is (Gemini Vision)
- Pick fabric, color, shot type, and preservation lock
- Generate the branded image directly in the app (Gemini Image)
- Save to a shared team library
- Invite teammates to collaborate

---

## 🚀 Setup (one-time, ~15 min)

### 1. Get your Gemini API key

1. Go to https://aistudio.google.com
2. Click **Get API key** → **Create API key**
3. Copy the key (starts with `AIza…`) — keep it in a note

### 2. Create your Supabase project

1. Go to https://supabase.com → sign in → **New project**
2. Pick any name, set a database password, choose a region close to Egypt (e.g., Frankfurt / `eu-central-1`)
3. Wait ~2 minutes for it to provision

### 3. Run the database schema

1. In Supabase → **SQL Editor** (sidebar)
2. Open `supabase/schema.sql` from this repo
3. Paste it entirely into the SQL editor → **Run**

You should see "Success. No rows returned."

### 4. Create the storage bucket for generated images

1. In Supabase → **Storage** (sidebar) → **New bucket**
2. Name: `generated-images`
3. **Public bucket: ON** (so generated images can be viewed in the library)
4. Click **Create bucket**

### 5. Disable email confirmation (for fast testing)

1. In Supabase → **Authentication** → **Providers** → **Email**
2. Turn **Confirm email** OFF (you can enable later if you want)
3. Click **Save**

### 6. Get your Supabase keys

1. In Supabase → **Project Settings** → **API**
2. Copy these two values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

### 7. Run locally to test

```bash
# In Terminal, in the project folder
npm install
cp .env.local.example .env.local
```

Then open `.env.local` and paste your three keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
GEMINI_API_KEY=AIzaSy...
```

Then:

```bash
npm run dev
```

Open http://localhost:3000 → sign up → start generating.

---

## ☁️ Deploy to Vercel

1. Create a new GitHub repo and push this folder
2. Go to https://vercel.com → **Add New → Project**
3. Import your GitHub repo
4. Before deploying, click **Environment Variables** and add the same three keys from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
5. Click **Deploy**

You'll get a URL like `kanabco-studio.vercel.app`. Share it with your team.

---

## 👥 Inviting teammates

1. Each teammate signs up at your deployed URL — they get their own workspace automatically
2. Go to **Team** page → enter their email → **Add**
3. They now see your shared library and can contribute

---

## 💰 Cost expectations

- **Vercel**: free tier handles this comfortably
- **Supabase**: free tier (500 MB database + 1 GB storage) — should last months
- **Gemini API**: ~$0.039 per image generated, free tier of ~1,500/day
- Total for a launch week (~100 images): **$3–8**

---

## 🐛 If something breaks

- **"Unauthorized" on generate**: you're not signed in — sign out and back in
- **"GEMINI_API_KEY is not set"**: env variable not set in Vercel; check Project Settings → Environment Variables and redeploy
- **Image upload doesn't show preview**: file > 10 MB? Resize first
- **Team invite "user not found"**: that email must sign up first

For any other issue, check the browser console (Cmd+Opt+J) and the Vercel function logs.
