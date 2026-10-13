# Character rigs and separate animation packs

## Diagnose before changing the controller

A character can load, bind animation tracks and render with zero console errors while its limbs are badly deformed. Compare anatomical hierarchy, translation units, neutral joint positions, local bone axes and world-space reference transforms. Preserve the original GLB while diagnosing.

Independent actors need [SkeletonUtils.clone](https://threejs.org/docs/pages/module-SkeletonUtils.html). Ordinary scene cloning can leave the new skinned mesh connected to the old actor's skeleton. Use a wrapper group for gameplay placement; do not alter a pristine reference rig to match the camera.

## The verified Synty case

Goblin War Camp character bones and Goblin Locomotion Polygon bones have compatible anatomy but different local axes. Copying a clip's local quaternion onto a same-named target bone twisted the demo's goblins. A name-only check missed the error.

For this compatible rig pair, the included helper changes quaternion bases:

```
q_target = inverse(B_target_parent) * B_source_parent
           * q_source
           * inverse(B_source_bone) * B_target_bone
```

`B` is a world-space quaternion from an authored, unanimated reference scene. Position tracks transfer offsets from the source reference into the target parent basis with the parent-scale ratio. Animated bone scaling is intentionally unsupported and omitted for this tested locomotion workflow.

Polygon finger names also differ: target `Thumb_01_L` maps to source `Thumb_01`; target `Thumb_01_R` maps to `Thumb_01_1`, with equivalent mappings for other finger segments. Inspect the real hierarchy before extending this convention to another export.

## Copyable integration

Copy `assets/retarget.js` into the application's source directory. All GLTFs in this example must be loaded locally or through authorized asset URLs first.

```js
import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import {
  buildRigTransfer, transferClip, bindReferenceClip,
} from './retarget.js';

// These are pristine loader results; neither has an active mixer or placement.
const mapping = buildRigTransfer(targetGLTF.scene, sourceReferenceGLTF.scene);
const actor = clone(targetGLTF.scene);
const placement = new THREE.Group();
placement.add(actor);
scene.add(placement);
const mixer = new THREE.AnimationMixer(actor);
const correctedIdle = transferClip(idleGLTF.animations[0], mapping, 'idle');
const idle = mixer.clipAction(correctedIdle).play();

const correctedWalk = transferClip(walkGLTF.animations[0], mapping, 'walk');
const walk = mixer.clipAction(correctedWalk);
walk.reset().fadeIn(0.2).play();
idle.fadeOut(0.2);
// Update mixer once per frame using delta seconds; move placement separately.
```

For an additive clip, transfer it first, then use the neutral bind reference:

```js
const correctedOverlay = transferClip(lookGLTF.animations[0], mapping, 'look');
THREE.AnimationUtils.makeClipAdditive(
  correctedOverlay, 0, bindReferenceClip(mapping),
);
correctedOverlay.blendMode = THREE.AdditiveAnimationBlendMode;
idle.reset().setEffectiveWeight(1).play();
mixer.clipAction(correctedOverlay).setEffectiveWeight(0.6).play();
// Keep the base layer active. Fade out the overlay when it is no longer needed.
```

[AnimationUtils.makeClipAdditive](https://threejs.org/docs/pages/AnimationUtils.html) uses a reference clip. An idle frame is a moving/hunched pose, so using it as the neutral reference can incorrectly affect the rest of the body. If the source asset is already authored as additive deltas, do not subtract a reference a second time; inspect its import/export behavior.

## Assumptions and limits

The helper was verified with Three.js 0.170.0 and the two Synty Goblin Locomotion rig variants. Its source template must describe the same neutral anatomical pose as the target, with compatible proportions and uniform positive parent scale. Targets must be neutral templates, not already posing actor clones. It expects simple named bone `position`/`quaternion` tracks with linear or step interpolation. It rejects unsupported cubic-spline tracks and nonuniform/mirrored parent scales.

A different rig with materially different proportions, hierarchy or reference posture needs proper retargeting or offline baking, not an assumed reuse of this formula. [SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils.html) also exposes general retarget APIs; inspect the installed implementation and validate the result before substituting one.

Do not call `skeleton.pose()` blindly to derive a reference from these scaled/rotated exports. In the tested GLBs it reapplied the armature transform and produced a false tiny reference. Use pristine neutral loader results and verify joint geometry.

When an actor is removed, stop its mixer and uncache the actor root. Dispose cloned skeleton bone textures. Geometry/materials and shared atlas textures remain shared resources; dispose them only when their final owner is removed. Plan root motion, additive layers, loop modes and action fades explicitly.
