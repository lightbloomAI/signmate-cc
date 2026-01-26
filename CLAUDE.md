# SignMate - Claude Code Context

## Mission

Build a scalable speech-to-ASL system that benefits the deaf community. Not limited to conferences — airports, movies, apps, kiosks, anywhere.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIGNMATE PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [ASR] → [Glossing] → [Motion Engine] → [Blending] → [Avatar]  │
│                                                                  │
│   NOW:       NOW:         NOW:            NOW:         NOW:      │
│   Web        Rule-based   JSON library    Interpolate  Three.js  │
│   Speech     dictionary   MediaPipe       (simple)     custom    │
│   API                     capture                                │
│                                                                  │
│   LATER:     LATER:       LATER:          LATER:       LATER:    │
│   Deepgram   ML model     Pro mocap       Learned      MetaHuman │
│   Whisper                 gloves          coartic.     or better │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Development Philosophy

**Cheap first, upgrade later.** Build with free/cheap components, prove it works, then swap in better parts. Every component should be replaceable.

**Show it can scale before spending.** No expensive hardware or services until the pipeline proves itself end-to-end.

## SignMate Motion Format (Universal)

Avatar-agnostic format. Capture once, render on any avatar.

```typescript
interface SignMotion {
  gloss: string; // "HELLO", "THANK-YOU"

  // Upper body (normalized joint rotations)
  body: JointFrame[]; // shoulder, elbow, wrist

  // Hands (21 joints each, per frame)
  leftHand: HandFrame[];
  rightHand: HandFrame[];

  // Face (ARKit-compatible blendshapes)
  face: FaceFrame[]; // jawOpen, mouthSmile, browUp, etc.

  // For blending between signs
  entryPose: Pose; // where hands start
  exitPose: Pose; // where hands end

  // Metadata
  fps: number; // typically 30
  frameCount: number;
  durationMs: number;
}
```

## Key Focus Areas

**Fingers**: Must be precise. ASL is a hand language.
**Face**: Critical differentiator. Facial grammar is linguistic, not decorative.
**Upper body**: Arms, shoulders, torso. No legs/dancing needed.

## Current Priorities

1. **Capture tool** — Browser-based MediaPipe recorder for building sign library
2. **Motion format** — Define spec, convert existing captures
3. **Blending engine** — Eliminate rest poses between signs, smooth transitions
4. **Avatar rig** — Three.js avatar optimized for hands/face

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

Husky runs on every commit:

1. lint-staged (Prettier)
2. `npm run typecheck`
3. `npm run test`

**IMPORTANT**: If hooks fail, fix errors before committing. Don't skip hooks.

## Code Conventions

- TypeScript strict mode
- Path alias: `@/*` → `./src/*`
- React functional components + hooks
- Zustand for state
- Three.js via @react-three/fiber
- Tests: Vitest + React Testing Library

## Architecture

```
src/
├── app/              # Next.js App Router pages
├── components/
│   ├── avatar/       # 3D avatar (Three.js/R3F)
│   ├── capture/      # Motion capture UI (TODO)
│   └── ...
├── hooks/
├── lib/
│   ├── speech/       # ASR (Deepgram, Aldea, Web Speech)
│   ├── asl/          # English → ASL glossing
│   ├── motion/       # Motion format, library, blending (TODO)
│   ├── animation/    # Pose interpolation
│   └── pipeline/     # Orchestration
├── store/            # Zustand state
└── types/
```

## ASL Domain Knowledge

**Glosses**: Uppercase notation for signs (HELLO, THANK-YOU, IX-1)
**Fingerspelling**: Unknown words spelled letter-by-letter (FS:CLAUDE)
**Non-manual markers**: Facial expressions, head movements — grammatically required, not optional
**Coarticulation**: Signs blend into each other based on neighbors

---

# Working Style with Claude Code

## Plan Mode

- Keep plans extremely concise. Sacrifice grammar for brevity.
- End every plan with unresolved questions, if any.
- Use plan mode for multi-file changes or architectural decisions.
- Skip planning for single-file fixes or obvious tasks.

## Session Management

- `/clear` between unrelated tasks
- `/compact` if context gets long during a task
- Course-correct early — interrupt with `Esc` if going wrong direction
- After 2 failed corrections, `/clear` and rewrite prompt

## Verification

**Always verify work.** Run tests, check types, take screenshots.

```bash
# After code changes
npm run typecheck && npm run test

# After UI changes
# Take screenshot, compare to expected
```

## Prompting Style

Be specific:

- ❌ "fix the bug"
- ✅ "login fails after session timeout. check src/auth/, write failing test, then fix"

Reference files directly:

- ❌ "look at the translator"
- ✅ "read src/lib/asl/translator.ts"

## Task Approach

1. **Explore** — Read relevant files, understand current state
2. **Plan** — Outline approach (for non-trivial tasks)
3. **Implement** — Write code
4. **Verify** — Run tests, typecheck
5. **Commit** — Descriptive message

## For Long/Autonomous Sessions

When running autonomously or AFK:

- Work on ONE focused task at a time
- Commit working increments frequently
- If stuck for 2+ attempts, stop and document the blocker
- Don't make sweeping changes without explicit approval

## Subagents

Use subagents for:

- Exploring unfamiliar parts of codebase
- Code review (fresh context, no bias)
- Research that would pollute main context

---

# Unresolved Questions

(Update this section as we work)

1. Which avatar to commit to first? (Leaning: custom Three.js rig)
2. MediaPipe vs other free capture for hand tracking quality?
3. Motion format — finalize spec before building capture tool?
4. How to handle signs with multiple valid forms?
