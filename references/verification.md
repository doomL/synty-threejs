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

Use a regression case that the previous broken binding fails. In the originating demo, name-only idle binding displaced a joint by about 27 cm; the corrected basis transfer matched core anatomical joints within about 0.023 mm across 424 clip/character combinations sampled 21 times. This records tested evidence for those exports, not guaranteed error bounds for other packs.

The public tests in this repository use synthetic skeletons and synthetic GLB bytes. They verify basis changes, position/scale transfer, finger mapping, independent actor cloning, additive reference behavior and unchanged texture/geometry bytes. They do not replace private real-pack validation in a new application.

## Browser behavior

Build the production bundle. Capture console/page errors and asset request failures. Check controls with user events: movement, camera, cancellation, jump/landing, crouch, dialogs and rig switching. Test simultaneous touch pointers, both orientations, viewport overflow and control reachability. Exercise repeated rig changes and verify bone texture counts stabilize after disposal.

If the user wants all animation clips available, test the complete exposed set on the relevant rig; do not infer success for the rest from one idle clip. Check that partial conversion failures are visibly reported.

A numerical test can validate deformed geometry without transmitting proprietary preview images. When visual inspection is authorized, also inspect representative poses and the composition locally. Report whether tests used physical hardware, browser emulation or synthetic inputs; never label headless software rendering as a phone performance measurement.
