# Contributing to the Public Research Portal

This repository hosts the public research site and documentation hub for the URF repository network.

## Contribution classes

### 1. Documentation and copy improvements

- clarify onboarding wording
- improve navigation text
- tighten route descriptions across pages
- fix broken or ambiguous references

### 2. Site and verification hardening

- improve repository verification surfaces
- tighten deployment-facing checks
- improve reproducibility guidance
- harden page/link consistency

### 3. Scope or authority changes

These require explicit justification.

- changing portal role declarations
- changing canonical routing language
- changing status or hosting boundaries
- expanding authority claims

## Preferred workflow

```bash
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch -c your-branch-name
```

Run the repository check before commit:

```bash
make verify
```

Then commit:

```bash
git add <files>
git commit -m "docs: improve onboarding surface"
git push -u origin your-branch-name
```

## Disallowed without explicit justification

- silent semantic changes
- changing portal-authority language without synchronized documentation updates
- expanding scope or status claims without updating the public entry surfaces
