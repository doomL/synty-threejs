# Character rigs and separate animation packs

## Diagnose before changing the controller

A character can load, bind animation tracks and render with zero console errors while its limbs are badly deformed. Compare anatomical hierarchy, translation units, neutral joint positions, local bone axes and world-space reference transforms. Preserve the original GLB while diagnosing.

Independent actors need [SkeletonUtils.clone](https://threejs.org/docs/pages/module-SkeletonUtils.html). Ordinary scene cloning can leave the new skinned mesh connected to the old actor's skeleton. Use a wrapper group for gameplay placement; do not alter a pristine reference rig to match the camera.

## Choose an animation source

Separate three facts: the model has a rig; the source file contains clips; the clips fit the requested motion. Check actual clip names, durations and channels. A character pack may supply only a skeleton; dedicated animation packs or authorized external libraries supply movement.

When external clips are permitted, use the library's official downloads and check its licence and formats. For example, [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app) publishes CC0 art assets that can be downloaded without an account; [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) requires an Adobe ID for its library. These are optional sources, not dependencies of this skill. Record the source/version and selected clips separately from the Synty model provenance.

Keep the source skeleton as a retargeting reference; its preview mesh need not be added to the application. Preserve a complete source library separately if useful, but ship only the selected animation data. Do not slow down a run clip and call it a walk without checking the resulting gait.

## Bind-basis transfer

Matching names can conceal different local bone axes. For compatible anatomical rigs, the included helper changes quaternion bases:

```
q_target = inverse(B_target_parent) * B_source_parent
           * q_source
           * inverse(B_source_bone) * B_target_bone
```

`B` is a world-space quaternion from an authored, unanimated reference scene. Position tracks transfer offsets from the source reference into the target parent basis with the parent-scale ratio. Animated bone scaling is intentionally unsupported and omitted for this tested locomotion workflow.

One supported Polygon naming convention maps target `Thumb_01_L` to source `Thumb_01`; target `Thumb_01_R` maps to `Thumb_01_1`, with equivalent mappings for other finger segments. Inspect the real hierarchy before extending this convention to another export.

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

A different rig with materially different proportions, hierarchy or reference posture needs proper retargeting or offline baking, not an assumed reuse of this formula. For differently proportioned targets, preserve target limb offsets unless the source intentionally translates those bones; transfer pelvis/root movement with verified units and coordinate bases. A name resolver only addresses naming, not anatomy or motion style.

The helper accepts optional `resolveBone(targetName, sourceNodes)` and `skipBone(targetBone)` callbacks. Keep unmapped anatomical bones as explicit errors. Skip IK, attachment or facial helpers only after confirming how the mesh is weighted and how their parents animate. The mapping is one-to-one; a hierarchy requiring one source bone to drive multiple target segments needs a different retargeting strategy. [SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils.html) also exposes general retarget APIs; inspect the installed implementation and validate the result before substituting one.

Do not call `skeleton.pose()` blindly to derive a reference from these scaled/rotated exports. In the tested GLBs it reapplied the armature transform and produced a false tiny reference. Use pristine neutral loader results and verify joint geometry.

When an actor is removed, stop its mixer and uncache the actor root. Dispose cloned skeleton bone textures. Geometry/materials and shared atlas textures remain shared resources; dispose them only when their final owner is removed. Plan root motion, additive layers, loop modes and action fades explicitly.

During rapid state changes, preserve the current pose contribution rather than repeatedly resetting partly blended actions. Keep base-layer weights normalized and align gait phases where the clips support it. Check that state selection itself is stable; an animation mixer cannot fix a controller that alternates states every few frames. These are animation-integration checks, not a prescribed game mechanic or controller implementation.
