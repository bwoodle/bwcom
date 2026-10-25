<!-- Root-level Copilot instructions for the bwcom monorepo -->

## Repository Structure

This is a monorepo with the following top-level directories:

- `bwcom-spa/` — React SPA frontend (production app)
- `bwcom-terraform/` — Terraform infrastructure (modules, env tiers)
- `photos/` — Source images (synced to S3)
- `cfn/` — CloudFormation templates (image CDN stacks)
- `scripts/` — Deploy, destroy, and image sync scripts

## Development Workflow: Refine → Plan → Execute

This repository defines three custom agents (in `.github/agents/`) that form a structured development workflow. Context flows through GitHub issues on `bwoodle/bwcom`.

| Step | Agent | Purpose | Invocation |
|------|-------|---------|------------|
| 1 | **refine** | Define WHAT to build | `Use the refine agent for #N` or `Use the refine agent` |
| 2 | **plan** | Define HOW to build it | `Use the plan agent for #N` |
| 3 | **execute** | BUILD it with TDD | `Use the execute agent for #N` |

## Architecture Principles

- React SPA is the only production frontend
- Serverless deployment is the default for prod/test
- Dependency injection over direct imports for service dependencies
- Loose coupling, modularity, and testability
- TDD: tests first, implementation second, refactor third

## Required Change Workflow

Any agent that writes or modifies code in this repository must use test-driven development:

1. Add or update the relevant automated test first.
2. Run the targeted test and observe the failure.
3. Implement the code change.
4. Run the relevant validation commands before considering the work complete.

## Worktree-First Development

Agents must not implement changes in the primary checkout at `/home/brent/code/bwcom`.

1. From the primary checkout, run `git gtr trust` once after `.gtrconfig` is first added.
2. Create a dedicated worktree with `git gtr new <branch> --from-current`.
3. Let the trusted `postCreate` hook run `just bootstrap`.
4. Run all edits, tests, commits, and agent sessions from the worktree checkout.

## Local Development

### Starting the local dev server

```bash
cd bwcom-spa
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

### Required Environment Variables (`bwcom-spa/.env.local`)

```env
VITE_IMAGES_BASE_URL=https://<cloudfront-domain>
VITE_GOOGLE_CLIENT_ID=<your-client-id>
VITE_APP_VERSION=local
```

## Build, Lint, and Test

```bash
just bootstrap
just lint
just test

cd bwcom-spa
npm run build
npm test
```

## Deploying the SPA

```bash
./scripts/deploy-serverless-spa.sh test
./scripts/deploy-serverless-spa.sh prod
```

The production site is served by the React SPA deployed to CloudFront/S3.
