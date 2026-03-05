# Architecture Decisions

## ADR 001: Deployment Strategy (2026-03-05)

### Status
Accepted

### Context
The project contains both interactive games and functional AI tools. These have different scaling, automation, and asset hosting needs.

### Decision
We will use a hybrid hosting model:
1. **Firebase Hosting**: Primary domain (nish-logic.web.app) and all **Tools**.
2. **GitHub Pages**: All **Games** and static data archives.

### Consequences
- Deployment requires two steps: `git push` (for Games) and `firebase deploy` (for Tools).
- All links in the main portal must be absolute URLs to ensure cross-domain navigation.
