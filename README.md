# synty-threejs

An agent skill for building Three.js scenes with licensed Synty models and animations. It captures the practical workflow for MCP asset export, correct rig animation transfer, shared atlas textures and mobile third-person controls.

The most important lesson: matching bone names does **not** make two rigs' local rotations interchangeable. The included retargeting module addresses the compatible Goblin War Camp / Goblin Locomotion rig pair and ships with synthetic regression tests.

## Install in Codex

```sh
git clone https://github.com/doomL/synty-threejs.git
mkdir -p ~/.codex/skills
ln -s "$(pwd)/synty-threejs" ~/.codex/skills/synty-threejs
```

If you use a custom Codex home, put the skill under its `skills` directory. Do not replace an existing installation without inspecting it. Start a new session if the current one has already loaded its skill catalog.

Example invocation:

```text
Use $synty-threejs to build a mobile third-person tech demo
using the Synty packs already available in my local library.
```

The skill also consists of standard Markdown instructions and JavaScript/Python helpers that can be used manually or adapted for another agent.

## Contents

- [SKILL.md](SKILL.md): entrypoint and workflow.
- [Animation guide](references/animation-rigs.md): bind axes, cloning, additive layers and helper assumptions.
- [MCP workflow](references/mcp-workflow.md): optional integration with [Synty Asset MCP](https://github.com/doomL/synty-asset-mcp).
- [Mobile and textures](references/mobile-and-textures.md): texture sharing and touch controls.
- [Verification](references/verification.md): actual posed geometry and browser tests.
- `assets/retarget.js`, `assets/shared-textures.js`: modules to copy into application source.
- `scripts/share_glb_textures.py`: byte-preserving extraction into exported copies.

## Run the public tests

```sh
npm ci
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
```

The JavaScript helpers are tested against Three.js **0.170.0**. Other versions and other anatomical rigs need verification. The source workflow was validated locally with purchased assets; the public repository contains synthetic tests and code only.

No Synty models, animation files, textures, previews, purchase catalogs, cookies or account details are included. You need your own licensed assets. This repository does not grant a Synty licence and is not affiliated with Synty Studios. Code licence: Apache-2.0.
