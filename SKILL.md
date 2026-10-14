---
name: synty-threejs
description: Integrate licensed Synty models, materials and compatible character animations into Three.js scenes, including rig transfer, texture sharing and mobile verification. Use for Synty asset integration or repair, rather than generating replacement artwork or general frontend design.
---

# Synty + Three.js

Use the user's available Synty assets in the requested Three.js project. This skill works with local files, existing exports or an asset provider; no MCP server is required. Keep asset acquisition and conversion separate from application behavior.

## Establish the inputs

Inspect the project, installed Three.js version, source files and exported metadata. Confirm units, axes, pivots, materials and actual animation clips before choosing an integration path. Ownership of a pack does not prove that its files are available, and a rigged character does not prove that animations are included.

Keep originals immutable and preserve model and animation provenance separately. Respect the user's artwork and licensing constraints. If they allow external animations, keep the chosen Synty models and use only authorized animation sources; do not assume permission to substitute meshes or textures. Keep proprietary assets and account/session data outside public code and skill repositories.

When the user chooses Synty Asset MCP, read the optional [MCP integration guide](references/mcp-workflow.md). Its job is to supply files and metadata; the rest of this workflow does not depend on it.

## Place models and verify materials

Use verified export units and bounds rather than a pack-wide scale guess. Preserve authored pivots through a placement wrapper. Never apply a second centimetre-to-metre correction merely because an armature has a 0.01 scale. Distinguish posed skinned bounds from raw accessor bounds, which may ignore skinning or parent transforms.

A successful load does not prove texture completeness. Check material assignments, UVs, image dependencies and failed requests. Distinguish an intentionally untextured material from a missing expected texture; preserve the former and repair the latter. Avoid replacing all materials with one default atlas when the source specifies separate atlases or material slots.

Use instancing for repeated static geometry while retaining each source mesh's local transform and material assignments. Share textures only when image and sampler/UV state are compatible; see [textures and mobile rendering](references/mobile-and-textures.md).

## Select and adapt animations

Read [animation sources and rig compatibility](references/animation-rigs.md) when integrating characters or separate animation libraries.

Choose clips for the requested character and action, not just for compatible bone names. Retargeting can preserve valid anatomy while retaining an unsuitable posture or movement style. Identify unavailable clips early and use an authorized alternative when one is permitted.

Use `SkeletonUtils.clone` for independent skinned actors. Preserve their bind matrices and armature transforms. Build mappings from pristine, unanimated reference rigs. Keep world placement outside the templates.

The optional [retarget helper](assets/retarget.js) handles compatible anatomy with differing bind axes; its limits and verified cases are documented in the animation reference. It is not a universal humanoid retargeter. Different hierarchies, proportions or reference poses may need offline baking or another validated approach.

Plan loop modes, root motion, base/additive layers and interruptible transitions. Keep a base pose under additive layers, use the correct neutral reference, and avoid applying root displacement twice. Test transitions under repeated input changes, not just isolated clips. Export/load the clips the application needs; a large source library does not need to enter the initial bundle.

## Match the requested view and device

Honor the requested camera perspective and composition. For a mobile third-person controller, support simultaneous movement and look pointers, cancellation, resizing and safe-area spacing. Budget pixel ratio, antialiasing, shadows, decoded texture memory and active rigs against the actual target devices; see [mobile rendering](references/mobile-and-textures.md).

## Verify the integration

Read [verification](references/verification.md) for posed geometry, material checks and runtime behavior. Test the relevant character variants and exposed clips, including loop and transition boundaries. A numerical pose check establishes structural correctness, not visual suitability; inspect representative motion when authorized.

Build the application and exercise the requested controls, camera and interactions. Report meaningful limitations and distinguish synthetic tests, browser emulation and physical-device measurements. Do not generalize one export's measured tolerance or performance budget to unrelated assets.
