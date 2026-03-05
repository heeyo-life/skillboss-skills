# MCP Server Release Process

This document explains how to release the SkillBoss MCP Server to npm and the Claude Marketplace (MCP Registry).

## Overview

When you create a GitHub release, two automated workflows execute in sequence:

1. **npm Publish** - Publishes the package to npm
2. **MCP Registry Publish** - Publishes the package to the Claude Marketplace

Both workflows are triggered by creating a GitHub release tag.

## Prerequisites

### Required GitHub Secrets

Before you can publish, ensure these secrets are configured in your GitHub repository:

1. **NPM_TOKEN** (Required)
   - Go to [npmjs.com](https://www.npmjs.com) and log in
   - Navigate to Access Tokens in your account settings
   - Create a new "Automation" token (or "Classic" token with publish permissions)
   - Add it to GitHub: Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: Your npm token (starts with `npm_...`)

2. **GitHub OIDC** (Automatic)
   - No setup required - GitHub OIDC tokens are automatically provided by GitHub Actions
   - The workflow uses `id-token: write` permission to authenticate with the MCP Registry

## Release Steps

### 1. Prepare the Release

Before creating a release, ensure:

1. All changes are merged to the `main` branch
2. The version in `package.json` has been updated
3. Tests pass and the package builds successfully locally

```bash
cd mcp-server
npm install
npm run build
npm run test  # if you have tests
```

### 2. Create a Git Tag

Create a new tag matching the version in `package.json`:

```bash
# Example: if package.json version is "1.0.2"
git tag v1.0.2
git push origin v1.0.2
```

### 3. Create GitHub Release

You can create a release via:

**Option A: GitHub CLI**
```bash
gh release create v1.0.2 \
  --title "v1.0.2" \
  --notes "Release notes go here"
```

**Option B: GitHub Web UI**
1. Go to your repository on GitHub
2. Click "Releases" → "Draft a new release"
3. Choose the tag you created (v1.0.2)
4. Add a title and description
5. Click "Publish release"

### 4. Monitor the Workflows

After creating the release:

1. Go to Actions tab in your GitHub repository
2. Watch the workflows execute:
   - **Publish to npm** - should complete in ~2-3 minutes
   - **Publish to MCP Registry** - starts automatically after npm publish, completes in ~2-3 minutes

### 5. Verify Publication

**Verify npm:**
```bash
npm view @skillboss/mcp-server
```

**Verify MCP Registry:**
- Visit the Claude Marketplace
- Search for "SkillBoss"
- Your package should appear with the new version

## Workflow Details

### npm Publish Workflow

**File:** `.github/workflows/npm-publish.yml`

**Triggers:**
- On release publication
- Manual dispatch (with optional dry-run)

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build TypeScript (`npm run build`)
5. Verify build output
6. Publish to npm with provenance
7. Verify publication

**Key Features:**
- Uses npm provenance for supply chain security
- Publishes as public scoped package (`--access public`)
- Includes build verification before publishing
- Dry-run mode available for testing

### MCP Registry Publish Workflow

**File:** `.github/workflows/mcp-registry-publish.yml`

**Triggers:**
- On release publication
- Manual dispatch

**Steps:**
1. Checkout code
2. Get package information
3. **Wait for npm package** (polls for up to 5 minutes)
4. Download mcp-publisher tool
5. Authenticate with GitHub OIDC
6. Validate server.json
7. Publish to MCP Registry

**Key Features:**
- Automatically waits for npm package to be available
- Retries for up to 5 minutes with 10-second intervals
- Uses GitHub OIDC for secure authentication
- Validates server configuration before publishing

## Manual Workflow Dispatch

Both workflows support manual triggering for testing or re-publishing:

```bash
# Trigger npm publish (dry run)
gh workflow run npm-publish.yml -f dry_run=true

# Trigger npm publish (actual)
gh workflow run npm-publish.yml

# Trigger MCP registry publish
gh workflow run mcp-registry-publish.yml
```

## Troubleshooting

### npm Publish Fails

**Problem:** "npm ERR! 401 Unauthorized"
- **Solution:** Check that NPM_TOKEN is set correctly in GitHub secrets

**Problem:** "npm ERR! 403 Forbidden"
- **Solution:** Ensure you have publish permissions for @skillboss scope on npm

**Problem:** Build files missing
- **Solution:** Check that `npm run build` completes successfully and creates `dist/` directory

### MCP Registry Publish Fails

**Problem:** "Package not available after X seconds"
- **Solution:** Check that npm publish workflow completed successfully first
- **Solution:** npm may take a few minutes to propagate; try re-running the workflow

**Problem:** "Authentication failed"
- **Solution:** Verify repository has `id-token: write` permission enabled
- **Solution:** Check that GitHub Actions is enabled for the repository

**Problem:** "Validation failed"
- **Solution:** Check `server.json` format using `mcp-publisher validate` locally
- **Solution:** Ensure package name in server.json matches package.json

### Version Already Exists

**Problem:** "npm ERR! 403 You cannot publish over the previously published versions"
- **Solution:** Bump the version in `package.json` before creating a new release

## Best Practices

1. **Version Bumping**
   - Follow semantic versioning (MAJOR.MINOR.PATCH)
   - Update version in `package.json` AND `server.json` together
   - Create meaningful release notes

2. **Testing Before Release**
   - Test the built package locally:
     ```bash
     cd mcp-server
     npm run build
     npm pack
     npm install -g ./skillboss-mcp-server-*.tgz
     skillboss-mcp
     ```

3. **Release Notes**
   - Include what's new, changed, fixed
   - Mention breaking changes prominently
   - Link to relevant issues/PRs

4. **Monitoring**
   - Watch workflow logs during publish
   - Verify package is available on npm
   - Test installation from npm immediately after publish

## Package Configuration

### package.json

Key fields for publishing:

```json
{
  "name": "@skillboss/mcp-server",
  "version": "1.0.1",
  "files": ["dist", "README.md"],
  "main": "dist/index.js",
  "bin": {
    "skillboss-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "prepare": "npm run build"
  }
}
```

- `files`: Specifies what gets included in the npm package
- `prepare`: Automatically runs before packing/publishing
- `bin`: Makes the CLI executable available

### server.json

MCP Registry configuration:

```json
{
  "name": "io.github.heeyo-life/skillboss",
  "version": "1.0.1",
  "packages": [{
    "registryType": "npm",
    "identifier": "@skillboss/mcp-server",
    "version": "1.0.1"
  }]
}
```

- Version in server.json must match package.json
- `identifier` must match npm package name

## Security Notes

- **NPM_TOKEN**: Keep this secret secure; never commit it to the repository
- **npm provenance**: Automatically signed using GitHub OIDC for supply chain security
- **GitHub OIDC**: No secrets needed; uses GitHub's identity system
- **Access tokens**: Use automation tokens with minimal required permissions

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. Verify all secrets are configured correctly
3. Ensure package.json and server.json versions match
4. Review this documentation for troubleshooting steps

For additional help, contact the SkillBoss team at support@skillboss.co
