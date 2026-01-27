# SignMate: Speech-to-Sign Avatar Research

## Project Goal

Real-time speech → text → ASL signing avatar

---

## Pipeline Architecture

```
[One-time Preparation]
3D Mocap Dataset → Retarget to RPM skeleton → Store as animation library

[Runtime Pipeline]
Audio → ASR → Text → NLP/Gloss Parser → Animation Lookup → Coarticulation Engine → Avatar Playback
       (Whisper)      (Text-to-Gloss)    (Sign Library)    (Blending)
```

---

## Available 3D ASL Datasets

### 1. SignAvatars (ECCV 2024) ⭐ RECOMMENDED

- **URL**: https://github.com/ZhengdiYu/SignAvatars
- **Format**: SMPL-X parameters (.pkl files)
- **Size**: 70K motion sequences, 8.34M frames, 153 signers
- **ASL Content**: 34K clips from How2Sign Green Screen subset
- **Includes**: Body pose, hand pose (MANO), face expressions
- **Access**: Request form required (non-commercial research)
- **Data structure**:
  ```
  root_pose: (num_frames, 3)
  body_pose: (num_frames, 63)
  left_hand_pose: (num_frames, 45)
  right_hand_pose: (num_frames, 45)
  jaw_pose: (num_frames, 3)
  expression: (num_frames, 10)
  ```

#### Download Instructions (SignAvatars)

**Step 1: Get Motion Annotations (SMPL-X)**

1. Fill form at: https://github.com/ZhengdiYu/SignAvatars#dataset-download
2. Agree to Data License (non-commercial research)
3. Receive email with download links for motion (.pkl) and text labels

**Step 2: Get Original Videos (ASL subset)**
Since SignAvatars doesn't distribute videos, download separately:

1. Go to How2Sign: https://how2sign.github.io/
2. Download **Green Screen RGB clips**
3. Place in `language2motion/` folder

**Step 3: Match videos with annotations**
The SignAvatars annotations reference How2Sign clip IDs.

**Folder Structure:**

```
SignAvatars/
├── language2motion/          # ASL subset
│   ├── smplx/                # Smoothed SMPL-X params
│   ├── unsmooth_smplx/       # Raw SMPL-X params
│   └── [How2Sign videos]     # Downloaded separately
├── word2motion/              # Isolated signs
├── HamNoSys/                 # Other sign languages
└── GSL/                      # Greek Sign Language
```

### 2. How2Sign

- **URL**: https://how2sign.github.io/
- **Size**: 80+ hours of ASL video
- **3D Subset**: 3 hours captured in Panoptic studio (multi-view 3D)
- **Includes**: Speech, English transcripts, depth data
- **License**: CC BY-NC 4.0

### 3. StudioGalt Archive

- **URL**: https://github.com/StudioGalt/Sign-Language-Mocap-Archive
- **Format**: FBX
- **Status**: ❌ Skeleton looks tacky (user tested)

---

## Data Completeness Analysis

### SignAvatars Coverage

- **34K ASL clips** from How2Sign
- **Continuous signing** (sentence-level, not isolated)
- **Pros**: Natural coarticulation captured, real signers
- **Cons**: May not cover all vocabulary

### What might be missing?

| Category                     | Estimated Need | SignAvatars?       |
| ---------------------------- | -------------- | ------------------ |
| Core vocabulary (1000 signs) | Essential      | Likely covered     |
| Fingerspelling (A-Z)         | Essential      | Needs verification |
| Numbers (0-100)              | Important      | Needs verification |
| Classifiers                  | Important      | Partial            |
| Regional variants            | Nice-to-have   | Limited            |

### Gap-Filling Options

1. **Capture missing signs** with FreeMoCap (multi-camera) → retarget
2. **Hand-author** critical missing signs in Blender
3. **Crowdsource** from Deaf community with proper capture setup

---

## Retargeting: SMPL-X → ReadyPlayerMe

### Challenge

SMPL-X and RPM have different skeletons. One-time retargeting needed per sign.

### Tools

1. **Blender + Auto-Rig Pro** - Best for batch processing
   - https://github.com/Shimingyi/ARP-Batch-Retargeting
2. **Mixamo as intermediate** - Upload, auto-rig, export
3. **Custom retargeting script** - Map joint rotations

### Retargeting Pipeline

```
SMPL-X .pkl → Python → Joint rotations → Blender → RPM skeleton → GLB animation
```

### SignAvatars Data Format (Verified)

**File structure:** `.pkl` files containing PyTorch tensors (need `map_location='cpu'`)

**Per-sign data:**

```python
{
  'smplx': (num_frames, 182),      # Smoothed SMPL-X params
  'unsmooth_smplx': (num_frames, 169),  # Raw params
  'left_valid': (num_frames,),     # Left hand visibility
  'right_valid': (num_frames,),    # Right hand visibility
  '2d': (num_frames, 106, 3),      # 2D keypoints
  'expression': ...                 # Facial expressions
}
```

**SMPL-X 182 parameters breakdown:**

```
Index     Parameter           Size    Description
─────────────────────────────────────────────────
0:3       root_pose           3       Global rotation (axis-angle)
3:66      body_pose           63      21 body joints × 3
66:111    left_hand_pose      45      15 hand joints × 3
111:156   right_hand_pose     45      15 hand joints × 3
156:159   jaw_pose            3       Jaw rotation
159:169   betas               10      Body shape (usually 0)
169:179   expression          10      Facial expression
179:182   cam_trans           3       Camera translation
─────────────────────────────────────────────────
Total                         182
```

**Loading code:**

```python
import torch, pickle

# Monkey-patch for CPU loading
original_load = torch.load
def cpu_load(*args, **kwargs):
    kwargs["map_location"] = "cpu"
    kwargs["weights_only"] = False
    return original_load(*args, **kwargs)
torch.load = cpu_load

data = pickle.load(open("sample.pkl", "rb"))
smplx = data['smplx']  # (num_frames, 182)
```

### Bone Mapping (SMPL-X → RPM)

**SMPL-X Body Joints (21 joints):**

```
0: pelvis        7: spine3        14: right_knee
1: left_hip      8: neck          15: left_ankle
2: right_hip     9: head          16: right_ankle
3: spine1        10: left_shoulder 17: left_foot
4: left_knee     11: right_shoulder 18: right_foot
5: right_knee    12: left_elbow    19: left_collar
6: spine2        13: right_elbow   20: right_collar
                 (+left_wrist, right_wrist implied)
```

**SMPL-X Hand Joints (15 per hand):**

```
0-2: index (MCP, PIP, DIP)
3-5: middle
6-8: pinky
9-11: ring
12-14: thumb
```

**RPM Target Bones:**

```
Hips, Spine, Spine1, Spine2, Neck, Head
LeftShoulder, LeftArm, LeftForeArm, LeftHand
RightShoulder, RightArm, RightForeArm, RightHand
LeftHandIndex1/2/3, LeftHandMiddle1/2/3, etc.
```

**Mapping Strategy:**

```
SMPL-X              →  ReadyPlayerMe
──────────────────────────────────────
pelvis              →  Hips
spine1              →  Spine
spine2              →  Spine1
spine3              →  Spine2
neck                →  Neck
head                →  Head
left_shoulder       →  LeftShoulder
left_elbow          →  LeftArm (note: elbow rotation = arm bone)
left_wrist          →  LeftForeArm
left_hand_joints    →  LeftHandIndex1/2/3, etc.
```

---

## Coarticulation: The Hard Problem

### What is Coarticulation?

Signs don't exist in isolation. The end of one sign flows into the beginning of the next.

```
[HELLO] + [HOW] + [YOU] ≠ [HELLO]...[HOW]...[YOU]
                        = [HELL→OW→OU] (blended)
```

### Key Concepts

#### 1. Entry/Exit Poses

Each sign has:

- **Entry pose**: Where hands start (can vary based on previous sign)
- **Core motion**: The meaningful part of the sign
- **Exit pose**: Where hands end (can vary based on next sign)

#### 2. Hold vs Movement

- **Movement-epenthesis**: Transition movement between signs
- **Hold deletion**: Reducing pauses for fluency

#### 3. Anticipation

Hands start moving toward next sign before current sign fully completes.

### Coarticulation Strategies

#### Strategy A: Pose Blending (Simple)

```javascript
// Linear interpolation between exit and entry poses
function blend(signA_exit, signB_entry, t) {
  return lerp(signA_exit, signB_entry, t);
}
```

**Pros**: Easy to implement
**Cons**: Looks robotic, unnatural transitions

#### Strategy B: Motion Graph (Better)

```
Build graph of sign transitions from continuous data
signA → signB uses captured transition (if exists)
         or synthesizes one (if not)
```

**Pros**: More natural
**Cons**: Needs transition data or synthesis

#### Strategy C: Neural Blending (Best)

Train model on continuous signing data to predict natural transitions.
**Pros**: Most natural
**Cons**: Requires ML expertise, training data

### Practical Approach for SignMate

1. **Use SignAvatars continuous data** - Already has natural coarticulation
2. **Segment into signs** but preserve overlap regions
3. **Store entry/exit velocities** not just poses
4. **Blend using velocity matching**:
   ```javascript
   // Match velocity at transition point
   function velocityBlend(signA, signB, overlapFrames) {
     const exitVel = signA.getVelocityAtExit();
     const entryVel = signB.getVelocityAtEntry();
     return smoothTransition(exitVel, entryVel, overlapFrames);
   }
   ```

---

## Implementation Phases

### Phase 1: Data Preparation

- [ ] Request SignAvatars dataset access
- [ ] Analyze ASL vocabulary coverage
- [ ] Identify gaps (fingerspelling, numbers, etc.)
- [ ] Set up retargeting pipeline (SMPL-X → RPM)
- [ ] Batch convert signs to RPM-compatible format

### Phase 2: Animation System

- [ ] Build sign animation library format
- [ ] Implement animation playback with Three.js
- [ ] Implement basic pose blending
- [ ] Test with sample sentences

### Phase 3: Coarticulation

- [ ] Extract entry/exit poses + velocities from data
- [ ] Implement velocity-aware blending
- [ ] Build transition database from continuous data
- [ ] Test fluency with longer passages

### Phase 4: Speech-to-Sign Pipeline

- [ ] Integrate ASR (Whisper)
- [ ] Build/integrate English → ASL Gloss parser
- [ ] Connect to animation system
- [ ] Real-time streaming

### Phase 5: Polish

- [ ] Facial expressions sync
- [ ] Mouth movements (mouthing English words)
- [ ] Eye gaze
- [ ] Natural timing/prosody

---

## Open Questions

1. **SignAvatars vocabulary coverage** - Need to analyze actual gloss list
2. **Fingerspelling** - Is it in the dataset or need to capture?
3. **Text-to-Gloss** - Existing models? Rule-based? Train our own?
4. **Licensing** - SignAvatars is non-commercial research only
5. **Real-time performance** - Can we blend smoothly at 30fps?

---

## Resources

### Datasets

- SignAvatars: https://signavatars.github.io/
- How2Sign: https://how2sign.github.io/
- ASL-LEX (lexicon): https://asl-lex.org/

### Retargeting

- ARP Batch Retargeting: https://github.com/Shimingyi/ARP-Batch-Retargeting
- SMPL-X: https://smpl-x.is.tue.mpg.de/

### Sign Language NLP

- SignWriting: https://www.signwriting.org/
- ASL Gloss conventions: research papers

### Related Projects

- SignAll (commercial)
- Motion Light Lab at Gallaudet

---

## Notes

_Last updated: 2024-01-27_
