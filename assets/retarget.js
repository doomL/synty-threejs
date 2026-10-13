import * as THREE from 'three';

// The two Synty FBX families have the same anatomical rig but different local
// bone axes. Bone names alone are not a compatible animation binding.
// Transfer each local rotation through the source and target bind bases:
// qt = inverse(Bt_parent) * Bs_parent * qs * inverse(Bs_bone) * Bt_bone.
// The templates are the authored, unanimated GLTF scenes. Skeleton.pose() is
// deliberately not used: these exports have a scaled/rotated armature parent.
function worldQuaternion(node) {
  const q = new THREE.Quaternion();
  node.getWorldQuaternion(q);
  return q.normalize();
}
function sourceBoneName(targetName, sourceNodes) {
  if (sourceNodes.has(targetName)) return targetName;
  const finger = /^(Thumb|IndexFinger|Finger)_\d\d_([LR])$/.exec(targetName);
  if (finger) {
    const base = targetName.slice(0, -2);
    const name = finger[2] === 'L' ? base : `${base}_1`;
    if (sourceNodes.has(name)) return name;
  }
  return null;
}
function uniformScale(node) {
  const scale = node.getWorldScale(new THREE.Vector3());
  const values = scale.toArray();
  if (values.some(v => !Number.isFinite(v) || v <= 0) ||
      Math.max(...values) - Math.min(...values) > Math.max(...values) * 1e-4) {
    throw new Error('Rig transfer requires uniform positive parent scale');
  }
  return scale.x;
}
export function buildRigTransfer(targetScene, sourceScene) {
  targetScene.updateMatrixWorld(true);
  sourceScene.updateMatrixWorld(true);
  const sourceNodes = new Map();
  sourceScene.traverse(node => sourceNodes.set(node.name, node));
  const mappings = new Map();
  targetScene.traverse(target => {
    if (!target.isBone) return;
    const name = sourceBoneName(target.name, sourceNodes);
    if (!name) throw new Error(`Unmapped target bone: ${target.name}`);
    const source = sourceNodes.get(name);
    const left = worldQuaternion(target.parent).invert().multiply(worldQuaternion(source.parent));
    const right = worldQuaternion(source).invert().multiply(worldQuaternion(target));
    const sourceScale = uniformScale(source.parent);
    const targetScale = uniformScale(target.parent);
    mappings.set(name, {
      targetName: target.name, left, right,
      sourcePosition: source.position.clone(), targetPosition: target.position.clone(),
      scale: sourceScale / targetScale,
      targetScale: target.scale.clone(), targetQuaternion: target.quaternion.clone(),
    });
  });
  return mappings;
}
export function transferClip(sourceClip, mappings, name) {
  const out = sourceClip.clone(), q = new THREE.Quaternion(), v = new THREE.Vector3();
  out.name = name;
  out.tracks = [];
  for (const sourceTrack of sourceClip.tracks) {
    if (sourceTrack.createInterpolant?.isInterpolantFactoryMethodGLTFCubicSpline) {
      throw new Error('Cubic-spline GLTF tracks require a separately validated bake');
    }
    const dot = sourceTrack.name.lastIndexOf('.');
    const sourceName = sourceTrack.name.slice(0, dot), property = sourceTrack.name.slice(dot + 1);
    const map = mappings.get(sourceName);
    // Props not present on the target are intentionally omitted. Scale is kept
    // at the target bind value; translation units are reconciled through the reference parent-scale ratio.
    if (!map || property === 'scale') continue;
    const track = sourceTrack.clone();
    track.name = `${map.targetName}.${property}`;
    if (property === 'quaternion') {
      for (let i = 0; i < track.values.length; i += 4) {
        q.fromArray(sourceTrack.values, i);
        q.premultiply(map.left).multiply(map.right).normalize().toArray(track.values, i);
      }
    } else if (property === 'position') {
      for (let i = 0; i < track.values.length; i += 3) {
        v.fromArray(sourceTrack.values, i).sub(map.sourcePosition)
          .multiplyScalar(map.scale).applyQuaternion(map.left).add(map.targetPosition)
          .toArray(track.values, i);
      }
    } else continue;
    out.tracks.push(track);
  }
  if (!out.tracks.length) throw new Error(`No compatible bone tracks: ${name}`);
  return out;
}

export function bindReferenceClip(mappings) {
 const tracks=[];
 for(const map of mappings.values()){
  tracks.push(new THREE.QuaternionKeyframeTrack(`${map.targetName}.quaternion`,[0],map.targetQuaternion.toArray()));
  tracks.push(new THREE.VectorKeyframeTrack(`${map.targetName}.position`,[0],map.targetPosition.toArray()));
 }
 return new THREE.AnimationClip('authored-bind-pose',0,tracks);
}
