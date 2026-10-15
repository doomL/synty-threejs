# Synty Asset MCP workflow

The optional server is [doomL/synty-asset-mcp](https://github.com/doomL/synty-asset-mcp). Inspect the connected server's live schemas: client prefixes and tool arguments can differ between versions. Resolve references from actual search results; the illustrative IDs below are pack metadata, not bundled assets.

## Discover before converting

1. Call `get_library_status` and `list_owned_packs`.
2. Use `search_assets` or `suggest_assets_for_scene` for the requested scene. `include_nonplaceable: true` may be needed when querying animation clips.
3. Inspect `get_asset_details` and `get_asset_dependencies` for chosen references. Distinguish characters/models from Unity-only prefabs, particles and UI.
4. If files are absent, use already-owned archives or the owner's configured Store session as authorized. `download_pack` runs as a job; an unavailable session has a manual-import fallback. Login is an owner operation; do not ask the agent to expose cookies or signed links.
5. Convert only what the scene needs. An unavailable source or failed conversion stays explicitly missing.

## Export a collection

Pass verified search references to `prepare_asset_collection`, choosing `preset`, `engine`, collection `name` and synchronous/asynchronous behavior from the live tool schema. The skill does not prescribe pack IDs, character types or animation choices.

Poll `get_job` using the returned `job_id`. `done` means the job completed, not that every requested entry exists: inspect its `result.missing`. A waiting call can return a still-running job when its timeout elapses; do not resubmit an identical conversion repeatedly.

`export_to` is optional and must be inside a configured `export_roots` directory. Otherwise the collection lives in the server's collection directory. A remote server's filesystem path is not automatically readable on the frontend machine; fetch authorized output URLs or transfer the collection privately.

The collection manifest contains `assets`, `missing`, `units`, `up_axis` and `loader_hint`. Entries include `ref`, `file`, `pack_id`, `bounds_m`, `skinned`, `animations` and conversion warnings. Read the documented manifest schema rather than assuming field names from a different exporter.

## Choose a preset and retain provenance

`threejs_web` is a straightforward GLB baseline. `threejs_mobile` uses Draco and smaller JPEG textures in this server, so wire its required `DRACOLoader`; the name alone is not evidence of better runtime performance. Inspect `extensions_required` and the loader hint. Keep animation preservation enabled when needed.

Keep references and conversion provenance in the project's private manifest. Check metre height numerically before adding a character; root/armature 0.01 scales can be valid. Do not bake a rig just to make every node's scale equal one.

## Inspect exported content

Use `get_asset_details` to distinguish catalog classification from verified exported content. A skinned GLB can have no clips. Check whether animation export was disabled before concluding that the source has none. Use conversion material diagnostics and `get_asset_dependencies` to distinguish missing references from explicitly untextured slots.

Characters are often nodes of one shared bundle model (`Characters.fbx`) whose prefabs embed every character with all but one switched off. Check that `node_in_model` names the requested character and that the export shows it, not a sibling or an attachment item; older server versions took the first, inactive renderer. Read conversion warnings for automatic unit fixes and removed shadow/collision proxies, and compare a large piece of each pack against its expected real size before assuming the remaining assets are right.

Collection provenance identifies each asset's source separately; maintain that distinction when combining a model and an animation library in the application. The server preserves/converts clips but does not select their movement style, retarget actors or build an application controller.

Obtain a pristine source reference rig for a separate animation library. The animated first frame is not a substitute for an authored neutral reference. The rig-transfer procedure belongs in [the animation guide](animation-rigs.md), whether the files came from this MCP or another exporter.
