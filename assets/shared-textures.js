// Verified with GLTFLoader in Three.js 0.170.0. Recheck parser associations on
// upgrades. External image URLs must denote shared, byte-identical images.
export function createTextureReuse() {
  const textures = new Map();
  function reuse(gltf, modelURL, baseURL = globalThis.location?.href) {
    const model = new URL(modelURL, baseURL);
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
          const texture = material[key];
          if (!texture) continue;
          const index = gltf.parser.associations.get(texture)?.textures;
          const source = gltf.parser.json.textures?.[index]?.source;
          const uri = gltf.parser.json.images?.[source]?.uri;
          // An embedded/data URI belongs to its own GLB; do not identify it by
          // an arbitrary local image index or texture name.
          if (!uri || uri.startsWith('data:') || uri.startsWith('blob:')) continue;
          const fingerprint = JSON.stringify([
            new URL(uri, model).href, texture.colorSpace,
            texture.wrapS, texture.wrapT, texture.magFilter, texture.minFilter,
            texture.flipY, texture.channel, texture.anisotropy,
            texture.format, texture.type, texture.premultiplyAlpha,
            texture.unpackAlignment, texture.generateMipmaps,
            texture.matrixAutoUpdate ? ['auto', texture.offset.toArray(),
              texture.repeat.toArray(), texture.center.toArray(), texture.rotation]
              : ['matrix', texture.matrix.elements],
          ]);
          const existing = textures.get(fingerprint);
          if (existing && existing !== texture) {
            material[key] = existing;
            texture.dispose();
          } else textures.set(fingerprint, texture);
        }
      }
    });
    return gltf;
  }
  reuse.count = () => textures.size;
  // Only call after the last mesh using these shared resources is removed.
  reuse.dispose = () => { for (const texture of textures.values()) texture.dispose(); textures.clear(); };
  return reuse;
}
