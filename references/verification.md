# Verify geometry and behavior

## Animated geometry

An animation's presence and matched track count are necessary, not sufficient. Build a source-of-truth comparison using a compatible authored source reference and the target's neutral rig:

- Sample startup, intermediate poses and loop/transition boundaries.
- Compare world-space anatomical joint positions after transfer.
- Measure rigid anatomical limb-segment lengths against the neutral target.
- Compute bounds from posed skinned vertices. In Three.js, update world matrices and skeleton matrices, apply `mesh.applyBoneTransform(index, vertex)`, then the mesh's world matrix.
- Check continuity near clip switches; avoid treating a deliberate jump or a root-motion displacement as a discontinuity.
- Check finger side/segment correspondence and missing attachment bones separately.

Do not require fixed distances for IK handles, weapon targets, facial controls or root-to-pelvis offsets. These can legitimately translate. Different source/target anatomy can require different tolerances or a different retargeting approach.

Use a regression case that the previous broken binding fails. Choose tolerances from the relevant rig scale and anatomical expectations, not from another project's measured error.

Check movement style as well as structure: stance, torso posture, foot contact, stride at the controller's speed, and the intended action. Correctly transferred creature movement can still be unsuitable for a human character. Sampling geometry does not establish this visual suitability.

The public tests in this repository use synthetic skeletons and synthetic GLB bytes. They verify basis changes, position/scale transfer, finger mapping, independent actor cloning, additive reference behavior and unchanged texture/geometry bytes. They do not replace private real-pack validation in a new application.

## Materials

Compare exported material slots and image assignments against source metadata. Report missing expected textures separately from deliberately flat-colour materials. Check external image URLs, texture coordinate channels and separate atlases; the presence of one image in a GLB is not proof that every visible material is correct. Check loader errors and request failures as well as the loaded material maps.

## Browser behavior

Build the production bundle. Capture console/page errors and asset request failures. Check controls with user events: movement, camera, cancellation, jump/landing, crouch, dialogs and rig switching. Test simultaneous touch pointers, both orientations, viewport overflow and control reachability. Exercise repeated rig changes and verify bone texture counts stabilize after disposal.

Headless software rendering can run at about one frame per second. With a clamped frame delta, wall-clock waits then advance only a fraction of simulated time, so death poses, fades and timers look stuck. Step the simulation explicitly or inspect action times before diagnosing a bug. Likewise a preview harness that loops every clip shows the start of a one-shot clip sampled past its duration.

If the user wants all animation clips available, test the complete exposed set on the relevant rig; do not infer success for the rest from one idle clip. Check that partial conversion failures are visibly reported.

A numerical test can validate deformed geometry without transmitting proprietary preview images. When visual inspection is authorized, also inspect representative poses and the composition locally. Report whether tests used physical hardware, browser emulation or synthetic inputs; never label headless software rendering as a phone performance measurement.
