# Contributing to Ski Fall

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Run the dev server: `npm run dev`
- Run PartyKit locally: `npm run dev:party`
- Test your changes locally

### 3. Commit Your Changes

```bash
git add .
git commit -m "feat: your feature description"
```

The pre-commit hook will run TypeScript checks automatically. Fix any errors before committing.

### 4. Push and Open a PR

```bash
git push -u origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

### 5. Preview Deployments

When you open a PR, the following happens automatically:

| Service | What Deploys | URL Pattern |
|---------|--------------|-------------|
| **Netlify** | Frontend preview | `deploy-preview-{PR#}--{site}.netlify.app` |
| **PartyKit** | Backend preview | `ski-fall-pr-{PR#}.{username}.partykit.dev` |

The Netlify preview is automatically configured to connect to the PartyKit preview backend.

**A bot will comment on your PR with both URLs:**

> 🎿 **Preview Deployed!**
> 
> | | URL |
> |---|---|
> | 🎮 **Play** | https://deploy-preview-42--ski-fall.netlify.app |
> | 🔧 Backend | `https://ski-fall-pr-42.sjmog.partykit.dev` |

### 6. Review and Merge

Once your PR is approved and merged to `main`:

1. **Production deploys automatically**
   - Netlify rebuilds the production frontend
   - PartyKit deploys to production (if party/ files changed)

2. **Preview cleanup**
   - Your PartyKit preview deployment is automatically deleted
   - A cleanup confirmation comment is added to the PR

## Environment Setup

### Required Secrets (GitHub Actions)

- `PARTYKIT_LOGIN` - Your PartyKit username
- `PARTYKIT_TOKEN` - Generated via `npx partykit token generate`

### Required Variables (GitHub Actions)

- `PARTYKIT_USERNAME` - Your PartyKit username (for URL construction)
- `NETLIFY_SITE_NAME` - Your Netlify site name (e.g., `ski-fall` for `ski-fall.netlify.app`)

### Required Environment Variables (Netlify)

- `VITE_PARTYKIT_HOST` - Production PartyKit URL (e.g., `ski-fall.sjmog.partykit.dev`)
- `PARTYKIT_USERNAME` - Your PartyKit username (for preview URL construction)

## Local Development

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev

# In another terminal, start PartyKit dev server
npm run dev:party

# Run type checks
npm run typecheck

# Build for production
npm run build
```

## Quick Reference

| Action | Command |
|--------|---------|
| Start frontend | `npm run dev` |
| Start PartyKit | `npm run dev:party` |
| Type check | `npm run typecheck` |
| Build | `npm run build` |
| Deploy PartyKit manually | `npx partykit deploy` |

