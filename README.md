# 🎿 SKI FALL

A multiplayer ski racing game where players draw lines to guide their skier down the mountain. Built with React, TypeScript, and PartyKit for real-time multiplayer.

## 🎮 How to Play

1. **Create or Join a Game** - Share the room code with friends
2. **Draw Lines** - Use the pencil tool to create slopes for your skier
3. **Race!** - Click Start and guide your skier to the finish
4. **Compete** - Best time wins each round, cumulative scores determine the winner

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- npm (comes with Node.js)

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd ski-fall

# Install dependencies
npm install

# Start both the frontend and PartyKit server
npm run dev          # Terminal 1: Vite dev server (http://localhost:5173)
npm run dev:party    # Terminal 2: PartyKit server (localhost:1999)
```

Open http://localhost:5173 in your browser. That's it!

---

## 🌐 Deployment Setup

This project uses **Netlify** for the frontend and **PartyKit** for the multiplayer server. Both auto-deploy when you push to GitHub.

### What You'll Need

Before starting, you'll need accounts on:
- [GitHub](https://github.com) - for hosting your code
- [Netlify](https://netlify.com) - for hosting the frontend (free tier works great)
- [PartyKit](https://partykit.io) - for the multiplayer server (free tier works great)

### Step 1: Set Up PartyKit

1. **Login to PartyKit**
   ```bash
   npx partykit login
   ```
   This opens a browser window to authenticate.

2. **Get your PartyKit token**
   ```bash
   npx partykit token
   ```
   Copy this token - you'll need it for GitHub.

3. **Note your PartyKit username**
   Your username is shown when you run `npx partykit whoami`, or visible in your PartyKit dashboard.

### Step 2: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these **Secrets** (click "New repository secret"):

| Name | Value |
|------|-------|
| `PARTYKIT_LOGIN` | Your PartyKit username (e.g., `sjmog`) |
| `PARTYKIT_TOKEN` | The JWT token from Step 1 |

Add these **Variables** (click the "Variables" tab, then "New repository variable"):

| Name | Value |
|------|-------|
| `PARTYKIT_USERNAME` | Your PartyKit username (same as PARTYKIT_LOGIN) |

### Step 3: Set Up Netlify

1. **Connect your repo to Netlify**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Choose your GitHub repo
   - Netlify will auto-detect the build settings from `netlify.toml`

2. **Add environment variables**
   
   Go to **Site settings** → **Environment variables** → **Add a variable**

   | Key | Value | Scopes |
   |-----|-------|--------|
   | `VITE_PARTYKIT_HOST` | `ski-fall.YOUR_USERNAME.partykit.dev` | Production |
   | `PARTYKIT_USERNAME` | Your PartyKit username | All |

   Replace `YOUR_USERNAME` with your actual PartyKit username.

### Step 4: Deploy!

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

Both Netlify and PartyKit will automatically build and deploy. Check:
- **GitHub Actions** tab for PartyKit deployment status
- **Netlify dashboard** for frontend deployment status

---

## 🔄 How the CI/CD Works

### Push to `main` branch
| Service | What Happens | URL |
|---------|--------------|-----|
| Netlify | Builds & deploys production frontend | Your Netlify URL |
| PartyKit | Deploys production server | `ski-fall.{username}.partykit.dev` |

### Push to any other branch (e.g., `feature-xyz`)
| Service | What Happens | URL |
|---------|--------------|-----|
| Netlify | Creates a preview deploy | `deploy-preview-{n}--yoursite.netlify.app` |
| PartyKit | Deploys preview server | `ski-fall-feature-xyz.{username}.partykit.dev` |

The preview frontend automatically connects to the matching preview PartyKit server!

### Delete a branch
| Service | What Happens |
|---------|--------------|
| Netlify | Automatically removes preview |
| PartyKit | GitHub Action deletes the preview server |

---

## 📁 Project Structure

```
ski-fall/
├── src/                    # Frontend React app
│   ├── components/         # React components (GameCanvas, Lobby, etc.)
│   ├── hooks/              # Custom React hooks (usePhysics, usePartySocket, etc.)
│   ├── lib/                # Pure utility functions (physics, rendering, etc.)
│   └── types.ts            # TypeScript type definitions
├── party/                  # PartyKit server
│   ├── index.ts            # Main server logic
│   ├── level-generator.ts  # Random level generation
│   └── player-names.ts     # Random name generator
├── .github/workflows/      # GitHub Actions for PartyKit deployment
├── netlify.toml            # Netlify build configuration
└── partykit.json           # PartyKit configuration
```

---

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend) |
| `npm run dev:party` | Start PartyKit dev server (multiplayer) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

---

## 🔧 Environment Variables

### Local Development
No environment variables needed! The app defaults to `localhost:1999` for PartyKit.

### Production (Netlify)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_PARTYKIT_HOST` | PartyKit server URL | `ski-fall.myuser.partykit.dev` |
| `PARTYKIT_USERNAME` | Your PartyKit username (for branch previews) | `myuser` |

### GitHub Actions
| Secret/Variable | Type | Description |
|-----------------|------|-------------|
| `PARTYKIT_LOGIN` | Secret | Your PartyKit username |
| `PARTYKIT_TOKEN` | Secret | JWT auth token for PartyKit deploys |
| `PARTYKIT_USERNAME` | Variable | Your PartyKit username (for output URLs) |

---

## 🐛 Troubleshooting

### "Cannot connect to server" in production
- Check that `VITE_PARTYKIT_HOST` is set correctly in Netlify
- Verify the PartyKit deployment succeeded in GitHub Actions
- Make sure the PartyKit URL doesn't include `https://`

### PartyKit deployment fails
- Verify `PARTYKIT_TOKEN` is set in GitHub Secrets
- Try running `npx partykit login` again to refresh your token

### Changes not appearing in preview
- Preview deploys can take 1-2 minutes
- Check both Netlify and GitHub Actions for build status
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R) to clear cache

---

## 📝 License

MIT
