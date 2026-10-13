# Mobile rendering, texture memory and touch

## Share actual textures

A small compressed image is not a small decoded texture. A 2048 × 2048 RGBA image needs about 16 MiB before mipmaps. Many GLBs can embed byte-identical atlases while creating distinct textures at runtime.

In the originating demo, duplicated embedded atlas images would have occupied about 474 MB before mipmaps; four distinct originals used about 54 MB. These are observations from that asset selection, not universal Synty budgets.

The optional extractor preserves original image bytes and rebuilds exported copies with shared relative image URLs:

```sh
python3 scripts/share_glb_textures.py \
  /private/export/models/character.glb \
  --output /private/project/public/synty/models/character.glb \
  --texture-dir /private/project/public/synty/textures
```

Run it for the relevant exported files using the same texture directory. Supply the input/output paths yourself; the script has no account, catalog or workspace defaults. Originals remain untouched. It accepts a restricted self-contained GLB shape and refuses unsupported buffer-address extensions before writing output.

Serve both rewritten models and shared images. Update collection file sizes and preserve conversion/source hashes in the project's own manifest if it records them. Run the output through the same loaders used by the app; the GLB is no longer a single-file portable package.

Enable [THREE.Cache](https://threejs.org/docs/pages/Cache.html) for shared image loads, and reuse compatible `Texture` instances after GLTF loading:

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createTextureReuse } from './shared-textures.js';

THREE.Cache.enabled = true;
const loader = new GLTFLoader();
const reuse = createTextureReuse();
const model = await loader.loadAsync('/synty/models/character.glb');
reuse(model, '/synty/models/character.glb');
```

The utility includes image identity, colour space, sampler and UV-transform state in its sharing key. Loader cache hits alone do not guarantee GPU sharing. Its parser-association lookup is verified on Three.js 0.170.0; check the installed loader when changing versions. Keep embedded per-file images separate unless their bytes have actually been shown to match. Dispose shared textures after all actors using them are gone.

Inspect `renderer.info.memory.textures` alongside decoded image sizes. The texture count also includes skeleton bone textures and shadow maps, not only albedo atlases. Use `InstancedMesh` for repeated static meshes, retaining their local matrices. Skinned actors need independent skeletons.

## Touch controls

Use separate pointer IDs and pointer capture for movement and look. Simultaneous joystick/look is a real requirement for a third-person controller; single-pointer mouse emulation does not establish it. Reset inputs on `pointercancel`, lost capture, blur and visibility changes.

Keep the joystick and action controls away from browser chrome and safe-area insets. Handle portrait/landscape resizing. Prevent page dragging on the game surface while letting a scrollable animation panel scroll. Ensure dialogs leave the selected character visible and closing them restores interaction.

Treat run as a clear hold/toggle state; prevent duplicate jumps; distinguish airborne and landing transitions from idle. Use wrapper-group movement for in-place clips. Add camera obstruction handling and colliders appropriate to actual footprints, so tents do not become walk-through scenery.

Start with a modest pixel ratio, shadow resolution and number of dynamic lights. Measure draw calls, frame time and memory under the actual asset selection. Load required movement clips first, load the larger gallery on demand, and expose loading/failure states. Emulated browser tests validate interactions, not physical phone GPU performance.
