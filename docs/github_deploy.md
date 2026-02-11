# GitHub Deployment Guide

This document covers pushing The Signal to GitHub, common debugging, and useful GitHub tools.

## Prereqs

- Git installed and configured
- Optional: GitHub CLI (`gh`) for faster workflow

## One-time setup (new machine)

1. Configure Git identity

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

2. Authenticate to GitHub (optional but recommended)

```bash
gh auth login
```

## Deploy to GitHub (existing repo)

1. Initialize repo (skip if already a git repo)

```bash
git init
```

2. Add the remote

```bash
git remote add origin https://github.com/sisilabsai/thesignal
```

3. Commit your work

```bash
git add .
git commit -m "Initial MVP"
```

4. Push to main

```bash
git branch -M main
git push -u origin main
```

## Deploy to GitHub (new repo)

1. Create the repo with GitHub CLI

```bash
gh repo create sisilabsai/thesignal --private --source=. --remote=origin
```

2. Push

```bash
git add .
git commit -m "Initial MVP"
git push -u origin main
```

## Debugging common Git issues

- Check status

```bash
git status -sb
```

- Check remotes

```bash
git remote -v
```

- Pull with rebase

```bash
git pull --rebase origin main
```

- Resolve merge conflicts

```bash
git add <file>
git rebase --continue
```

- Abort a rebase

```bash
git rebase --abort
```

- Force push safely after rebase

```bash
git push --force-with-lease
```

## Helpful GitHub tools

- Issues for bug tracking and feature planning
- Projects for Kanban-style tracking
- Pull Requests for code review and history
- Actions for CI/CD and automated checks
- Releases for tagging public builds
- Dependabot for dependency updates
- Code Scanning for security alerts

## Useful GitHub CLI commands

- Create an issue

```bash
gh issue create --title "Bug" --body "Steps to reproduce..."
```

- Create a pull request

```bash
gh pr create --title "Update MVP" --body "Summary of changes"
```

- List workflows

```bash
gh workflow list
```

- Trigger a workflow

```bash
gh workflow run <workflow-name>
```

## Vercel deployment quick check

- Verify live API

```bash
curl https://thesignal-rho.vercel.app/api/health
```

- Verify index page is live in browser

```text
https://thesignal-rho.vercel.app
```
