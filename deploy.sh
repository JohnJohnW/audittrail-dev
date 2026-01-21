#!/bin/bash

# AuditTrail.dev Deployment Preparation Script

set -e

echo "🚀 Preparing AuditTrail.dev for Vercel deployment..."
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
  echo "📦 Initializing git repository..."
  git init
  git branch -M main
  echo "✅ Git initialized"
else
  echo "✅ Git repository already exists"
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo ""
  echo "📝 Staging all changes..."
  git add .
  
  echo ""
  read -p "Enter commit message (or press Enter for default): " commit_msg
  commit_msg=${commit_msg:-"Add production setup: Stripe, loading states, cron sync, additional controls"}
  
  git commit -m "$commit_msg"
  echo "✅ Changes committed"
else
  echo "✅ No uncommitted changes"
fi

# Check if remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
  echo ""
  echo "🔗 No remote repository configured"
  echo ""
  read -p "Do you want to add a GitHub remote? (y/n): " add_remote
  if [ "$add_remote" = "y" ]; then
    read -p "Enter GitHub repository URL (e.g., https://github.com/username/audittrail.git): " repo_url
    if [ -n "$repo_url" ]; then
      git remote add origin "$repo_url"
      echo "✅ Remote added"
      echo ""
      echo "📤 Pushing to GitHub..."
      git push -u origin main
      echo "✅ Pushed to GitHub"
    fi
  fi
else
  echo ""
  read -p "Push to existing remote? (y/n): " push_remote
  if [ "$push_remote" = "y" ]; then
    echo "📤 Pushing to GitHub..."
    git push origin main
    echo "✅ Pushed to GitHub"
  fi
fi

echo ""
echo "✨ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com and import your GitHub repository"
echo "2. Add all environment variables (see DEPLOYMENT.md)"
echo "3. Deploy!"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
