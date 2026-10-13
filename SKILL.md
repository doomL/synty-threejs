---
name: synty-threejs
description: Build or repair Three.js scenes using licensed Synty assets, including MCP export, character cloning, compatible rig animation transfer, shared textures, and mobile controls. Use for Synty model or animation integration; not for generating replacement artwork or general frontend design.
---

# Synty + Three.js

Turn the user's available Synty models into an inspectable, playable Three.js scene. Preserve the requested scope: a tech demo does not need invented missions or game systems.

## Establish what is available

Inspect the existing project, Three.js version, local manifest and configured MCP tools before selecting models. Use verified asset references; a purchased pack is not proof that its contents are indexed or convertible. Keep originals immutable and export only the selected models/clips into project-owned files.

- When sourcing/exporting through Synty Asset MCP, read [references/mcp-workflow.md](references/mcp-workflow.md). The MCP is optional when the project already has usable GLBs.
- Keep Synty meshes, textures, previews and session data outside a public skill or source-only repository. Follow the user's licence and publication scope. Model rendering in the application is separate from transmitting previews to external services.
- If the user requires Synty-only artwork, use Synty terrain, props and characters as well as Synty animation clips. Interface code, camera, lights, fog and collision math do not require replacement artwork. Do not silently substitute primitive scenery, Mixamo clips or generated images.

## Place static models

Use manifest bounds where available: the MCP exports metres, +Y up. Place a wrapper group around a model when moving/rotating it; account for its authored pivot rather than guessing an offset from the file name. Never blindly apply a second 0.01 scale correction. Use instancing for repeated static geometry while retaining each source mesh's local transform and materials.

Treat skinning-aware bounds separately from raw accessor bounds. Measure deformed vertices or use an evaluated converter report for a skinned character; accessor min/max can ignore the armature's scale and pose.

## Animate characters

Read [references/animation-rigs.md](references/animation-rigs.md) before applying a separate animation pack. Matching bone names do not establish matching local axes, bind poses or translation units.

Use `SkeletonUtils.clone` for independent skinned actors. Keep their armature transforms and inverse bind matrices intact. Build any transfer map from pristine, unanimated template scenes; keep actor/world placement outside those templates.

The copyable [assets/retarget.js](assets/retarget.js) implements the bind-basis transfer verified for Goblin War Camp and Goblin Locomotion. It includes Polygon finger-name mappings and additive reference clips. It is a narrowly scoped helper for compatible anatomy, not a universal humanoid retargeter. Inspect its documented assumptions before adopting it for a different pack. Do not replace a mismatch with a hand-tuned rotation on a few bones.

Crossfade locomotion states. Keep an idle/base layer under additive clips and derive their deltas from the authored reference pose. Decide explicitly whether root motion belongs to the clip or the movement controller, so displacement is not applied twice. Load the clips needed for interaction first; lazy-load the rest if the user wants an animation browser. Do not turn one demo's clip count into a requirement for every project.

## Keep mobile work usable

Read [references/mobile-and-textures.md](references/mobile-and-textures.md) for texture sharing and touch-control details. The copyable [assets/shared-textures.js](assets/shared-textures.js) reuses compatible Three.js textures by external image URL and sampler state. The optional [scripts/share_glb_textures.py](scripts/share_glb_textures.py) extracts identical image bytes from exported GLB copies into shared files; it leaves source GLBs untouched.

Provide loading/error states, reachable touch controls, safe-area spacing, simultaneous movement/look pointers, pointer cancellation, and resize/orientation handling. Test the intended interaction on portrait and landscape layouts. Budget pixel ratio, shadows, draw calls, decoded textures and active rigs; desktop success does not establish physical phone frame rate.

## Verify the result

Read [references/verification.md](references/verification.md) when testing animation or mobile behavior. Check actual posed geometry and joint positions, not just successful loading or nonempty tracks. Distinguish anatomical bones from IK/attachment helpers whose distances can intentionally change.

Test representative times and transitions, all character variants actually used, and the clips exposed to the user. Where a compatible source reference rig exists, compare world-space anatomical joint positions and rigid limb lengths after transfer. Choose tolerances appropriate to the source meshes; do not copy this project's measured error as a universal bound.

Before delivery, build the application and verify loading, movement, camera, jump/crouch if provided, collisions, rig changes, animation overlays and resource disposal. Report what was checked and whether mobile testing was emulated or performed on a real device. Publicly shipped source must not contain the user's private Synty content.
