# Synty Asset MCP workflow

The optional server is [doomL/synty-asset-mcp](https://github.com/doomL/synty-asset-mcp). Inspect the connected server's live schemas: client prefixes and tool arguments can differ between versions. Resolve references from actual search results; the illustrative IDs below are pack metadata, not bundled assets.

## Discover before converting

1. Call `get_library_status` and `list_owned_packs`.
2. Use `search_assets` or `suggest_assets_for_scene` for the requested scene. `include_nonplaceable: true` may be needed when querying animation clips.
3. Inspect `get_asset_details` and `get_asset_dependencies` for chosen references. Distinguish characters/models from Unity-only prefabs, particles and UI.
4. If files are absent, use already-owned archives or the owner's configured Store session as authorized. `download_pack` runs as a job; a unavailable session has a manual-import fallback. Login is an owner operation; do not ask the agent to expose cookies or signed links.
5. Convert only what the scene needs. An unavailable source or failed conversion stays explicitly missing.

## Export a collection

Example `prepare_asset_collection` arguments:

```json
{
  "refs": [
    "POLYGON_Goblin_War_Camp/SM_Chr_Warrior_Male_01",
    "ANIMATION_Goblin_Locomotion/A_POLY_GBL_Idle_Standing_Neut"
  ],
  "name": "goblin-scene",
  "preset": "threejs_web",
  "engine": "threejs",
  "zip_output": false,
  "wait": false
}
```

Poll `get_job` using the returned `job_id`. `done` means the job completed, not that every requested entry exists: inspect its `result.missing`. A waiting call can return a still-running job when its timeout elapses; do not resubmit an identical conversion repeatedly.

`export_to` is optional and must be inside a configured `export_roots` directory. Otherwise the collection lives in the server's collection directory. A remote server's filesystem path is not automatically readable on the frontend machine; fetch authorized output URLs or transfer the collection privately.

The collection manifest contains `assets`, `missing`, `units`, `up_axis` and `loader_hint`. Entries include `ref`, `file`, `pack_id`, `bounds_m`, `skinned`, `animations` and conversion warnings. Do not confuse a demo-specific manifest's `bounds` property with the MCP collection's `bounds_m`.

## Choose a preset and retain provenance

`threejs_web` is a straightforward GLB baseline. `threejs_mobile` uses Draco and smaller JPEG textures in this server, so wire its required `DRACOLoader`; the name alone is not evidence of better runtime performance. Inspect `extensions_required` and the loader hint. Keep animation preservation enabled when needed.

Keep references and conversion provenance in the project's private manifest. Check metre height numerically before adding a character; root/armature 0.01 scales can be valid. Do not bake a rig just to make every node's scale equal one.

## Separate animation templates

When using Goblin Locomotion with War Camp characters, also export the appropriate pristine source reference model:

- Polygon clips: `ANIMATION_Goblin_Locomotion/PolygonSyntyCharacter`.
- Sidekick clips: `ANIMATION_Goblin_Locomotion/SidekickSyntyCharacter`.

These describe the source rig's neutral anatomical pose and local bone bases. The animated first frame of a standalone clip is not a substitute. Other packs need their own verified source reference.
