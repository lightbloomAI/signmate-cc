# SignMate - Claude Code Context

## Project Overview

Real-time AI sign language interpreter for live events. Converts speech to ASL via 3D avatar animation.

**Pipeline:** Audio → ASR (Deepgram/Aldea) → Text → ASL Translator → Avatar Animation (Three.js)

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint + TypeScript check
npm run typecheck    # TypeScript only
npm run test         # Run Vitest tests
npm run test:watch   # Tests in watch mode
```

## Pre-commit Hooks

Husky runs on commit:

1. lint-staged (Prettier)
2. `npm run typecheck`
3. `npm run test`

If tests fail, commit blocks. Fix errors before committing.

## Architecture

```
src/
├── app/              # Next.js pages (App Router)
├── components/       # React components
│   ├── avatar/       # 3D avatar rendering (Three.js/R3F)
│   ├── display/      # Stage/livestream overlays
│   └── ...
├── hooks/            # Custom React hooks
├── lib/              # Core business logic
│   ├── speech/       # ASR integrations (Deepgram, Aldea)
│   ├── asl/          # English→ASL translation
│   ├── animation/    # Pose blending, interpolation
│   ├── pipeline/     # Streaming pipeline orchestration
│   └── ...
├── store/            # Zustand state management
└── types/            # TypeScript type definitions
```

## Key Files

- `src/lib/speech/speechManager.ts` - Unified ASR interface
- `src/lib/asl/translator.ts` - English→ASL glossary + translation
- `src/lib/animation/poseBlender.ts` - Sign blending/transitions
- `src/lib/pipeline/streamingPipeline.ts` - Real-time orchestration
- `src/components/avatar/AvatarRenderer.tsx` - Three.js avatar component
- `src/store/index.ts` - Global app state (Zustand)

## Code Conventions

- TypeScript strict mode enabled
- Path alias: `@/*` → `./src/*`
- React functional components with hooks
- Zustand for state (not Redux)
- Three.js via @react-three/fiber (R3F)
- Tests: Vitest + React Testing Library

## ASL Domain Knowledge

**Glosses:** Uppercase notation for ASL signs (e.g., `HELLO`, `THANK-YOU`)

**Key concepts:**

- Signs have: handshape, location, movement, non-manual markers (facial expressions)
- Word mapping: Many English words map to same sign (e.g., "hi"/"hey" → `HELLO`)
- Fingerspelling: Unknown words spelled letter-by-letter (prefix: `FS:`)
- Non-manual markers: head nods, facial expressions integral to grammar

## Testing

```bash
# Run all tests
npm run test

# Run specific test file
npx vitest run src/lib/asl/translator.test.ts

# Watch mode for TDD
npm run test:watch
```

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Common Tasks

**Add new ASL sign:** Edit `src/lib/asl/translator.ts`, add to `ASL_GLOSSARY` with handshape, location, movement, non-manual markers.

**Add speech provider:** Implement in `src/lib/speech/`, follow `DeepgramRecognizer` pattern, export from `index.ts`.

**Add component:** Create in appropriate `src/components/` subfolder, export from `index.ts`.
