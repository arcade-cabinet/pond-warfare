---
title: Release Signoff v1.3.0
updated: 2026-04-14
status: current
domain: ops
---
# Release Signoff v1.3.0

This is the canonical in-repo production signoff record for the current public build.

## Release Identity

- Version: `1.3.0`
- Release tag: [`v1.3.0`](https://github.com/arcade-cabinet/pond-warfare/releases/tag/v1.3.0)
- Release commit SHA: `bc16fea276d064bab99378d3dbba1e79f8a87c82`
- Release commit date (America/Chicago): `2026-04-14 00:21:20 -0500`
- Current browser audit baseline refresh on `main`: `2ca059d49777517e0fd83399fbe4b7a778391ca7`

## Automated Verification

- `pnpm verify:release`: pass on the release candidate that shipped `v1.3.0`
- `pnpm verify:browser-audit`: required post-release artifact gate for the canonical staged captures
- Browser audit manifest: [tests/browser/audit/MANIFEST.md](../tests/browser/audit/MANIFEST.md)

## Manual Signoff Reference

- Canonical signoff format: [docs/release-signoff-template.md](release-signoff-template.md)
- Release checklist: [docs/release-checklist.md](release-checklist.md)
- Note: the repo did not keep a first-class in-repo signoff record before this file. Historical manual device/browser notes for the shipped `v1.3.0` release remain in the release workflow history rather than a prior checked-in document.

## Current Production Truth

- Public release version remains `1.3.0`
- The browser audit baseline and release metadata were refreshed after tagging without changing the shipped gameplay contract
- Future releases should update this file or replace it with the next versioned signoff record instead of leaving release truth only in PR comments or GitHub Releases
