import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { buildRigTransfer, transferClip, bindReferenceClip } from '../assets/retarget.js';

const anatomy = [
 ['Root',null,[0,0,0]], ['Hips','Root',[0,1,0]],
 ['Shoulder_L','Hips',[.2,1.4,0]], ['Elbow_L','Shoulder_L',[.55,1.4,0]],
 ['Hand_L','Elbow_L',[.85,1.4,0]], ['Thumb_01_L','Hand_L',[.9,1.4,.025]],
 ['Thumb_02_L','Thumb_01_L',[.95,1.4,.035]],
 ['Shoulder_R','Hips',[-.2,1.4,0]], ['Elbow_R','Shoulder_R',[-.55,1.4,0]],
 ['Hand_R','Elbow_R',[-.85,1.4,0]], ['Thumb_01_R','Hand_R',[-.9,1.4,.025]],
 ['Thumb_02_R','Thumb_01_R',[-.95,1.4,.035]],
];
function sourceName(name) {
 if(name.startsWith('Thumb')&&name.endsWith('_L'))return name.slice(0,-2);
 if(name.startsWith('Thumb')&&name.endsWith('_R'))return name.slice(0,-2)+'_1';
 return name;
}
function rig(kind, scale=.01) {
 const scene=new THREE.Group(), armature=new THREE.Group();armature.name='Armature';armature.scale.setScalar(scale);armature.rotation.x=Math.PI/2;scene.add(armature);scene.updateMatrixWorld(true);
 const bones=new Map(),worldBind=new Map();
 for(let i=0;i<anatomy.length;i++){
  const[name,parentName,point]=anatomy[i];const parent=parentName?bones.get(parentName):armature;
  const bone=new THREE.Bone();bone.name=kind==='source'?sourceName(name):name;parent.add(bone);parent.updateWorldMatrix(true,false);
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(kind==='source'?.15*i:.4-i*.09,kind==='source'?.11*i:-.07*i,kind==='source'?.3+.08*i:-.6-.13*i));
  bone.position.copy(new THREE.Vector3(...point).applyMatrix4(parent.matrixWorld.clone().invert()));
  bone.quaternion.copy(parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  scene.updateMatrixWorld(true);bones.set(name,bone);worldBind.set(name,q);
 }
 return{scene,bones,worldBind};
}
function motion(source){
 const times=[0,.5,1],tracks=[];
 for(const[name,bone]of source.bones){const values=[];for(const amount of [0,.4,-.15]){
  const q=bone.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),amount));values.push(...q.toArray());
 }tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',times,values));
 const p=bone.position;tracks.push(new THREE.VectorKeyframeTrack(bone.name+'.position',times,[...p.toArray(),p.x+(name==='Hips'?8:0),p.y,p.z,...p.toArray()]));}
 return new THREE.AnimationClip('synthetic',1,tracks);
}
function worldPosition(scene,name){return scene.getObjectByName(name).getWorldPosition(new THREE.Vector3());}

test('different bind axes transfer real joint positions and orientation deltas',()=>{
 const source=rig('source'),target=rig('target'),map=buildRigTransfer(target.scene,source.scene),original=motion(source);
 const before=original.tracks.map(t=>Array.from(t.values));const fixed=transferClip(original,map,'corrected');
 const a=clone(source.scene),b=clone(target.scene),sm=new THREE.AnimationMixer(a),tm=new THREE.AnimationMixer(b);sm.clipAction(original).play();tm.clipAction(fixed).play();
 let error=0;
 for(const time of [.1,.25,.5,.75,.99]){
  sm.setTime(time);tm.setTime(time);a.updateMatrixWorld(true);b.updateMatrixWorld(true);
  for(const[name]of anatomy){error=Math.max(error,worldPosition(a,sourceName(name)).distanceTo(worldPosition(b,name)));
   const sourceDelta=a.getObjectByName(sourceName(name)).getWorldQuaternion(new THREE.Quaternion()).multiply(source.worldBind.get(name).clone().invert());
   const targetDelta=b.getObjectByName(name).getWorldQuaternion(new THREE.Quaternion()).multiply(target.worldBind.get(name).clone().invert());
   assert.ok(sourceDelta.normalize().angleTo(targetDelta.normalize())<1e-5);
  }
 }
 assert.ok(error<1e-5,`geometric error ${error}`);
 assert.deepEqual(original.tracks.map(t=>Array.from(t.values)),before,'source tracks were mutated');
 const broken=clone(target.scene),badClip=original.clone();badClip.tracks=badClip.tracks.filter(t=>broken.getObjectByName(t.name.split('.')[0]));const badMixer=new THREE.AnimationMixer(broken);badMixer.clipAction(badClip).play();badMixer.setTime(.5);sm.setTime(.5);broken.updateMatrixWorld(true);a.updateMatrixWorld(true);
 const expectedDelta=a.getObjectByName('Hand_L').getWorldQuaternion(new THREE.Quaternion()).multiply(source.worldBind.get('Hand_L').clone().invert()).normalize();
 const brokenDelta=broken.getObjectByName('Hand_L').getWorldQuaternion(new THREE.Quaternion()).multiply(target.worldBind.get('Hand_L').clone().invert()).normalize();
 assert.ok(expectedDelta.angleTo(brokenDelta)>.1,'old name-only skinning rotation should fail');
});

test('different uniform parent units preserve metre-space motion',()=>{
 const source=rig('source',.01),target=rig('target',1),clip=motion(source),fixed=transferClip(clip,buildRigTransfer(target.scene,source.scene),'units');
 const sm=new THREE.AnimationMixer(source.scene),tm=new THREE.AnimationMixer(target.scene);sm.clipAction(clip).play();tm.clipAction(fixed).play();sm.setTime(.5);tm.setTime(.5);source.scene.updateMatrixWorld(true);target.scene.updateMatrixWorld(true);
 for(const[name]of anatomy)assert.ok(worldPosition(source.scene,sourceName(name)).distanceTo(worldPosition(target.scene,name))<1e-5);
});

test('both hands map to the correct anatomical finger chain',()=>{
 const source=rig('source'),target=rig('target'),map=buildRigTransfer(target.scene,source.scene);
 assert.equal(map.get('Thumb_01').targetName,'Thumb_01_L');assert.equal(map.get('Thumb_01_1').targetName,'Thumb_01_R');assert.equal(map.get('Thumb_02_1').targetName,'Thumb_02_R');
});

test('unsupported scales, missing bones and cubic spline fail explicitly',()=>{
 const source=rig('source'),target=rig('target');target.scene.children[0].scale.set(1,2,1);assert.throws(()=>buildRigTransfer(target.scene,source.scene),/uniform positive/);
 target.scene.children[0].scale.set(-1,-1,-1);assert.throws(()=>buildRigTransfer(target.scene,source.scene),/uniform positive/);
 target.scene.children[0].scale.setScalar(.01);source.bones.get('Hand_L').name='unexpected';assert.throws(()=>buildRigTransfer(target.scene,source.scene),/Unmapped/);
 const clean=rig('source'),map=buildRigTransfer(target.scene,clean.scene),clip=motion(clean);clip.tracks[0].createInterpolant=function(){};clip.tracks[0].createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=true;assert.throws(()=>transferClip(clip,map,'cubic'),/Cubic-spline/);
});

test('neutral additive overlay leaves an independently posed base unchanged',()=>{
 const source=rig('source'),target=rig('target'),map=buildRigTransfer(target.scene,source.scene);const base=transferClip(motion(source),map,'base');
 const overlay=bindReferenceClip(map);THREE.AnimationUtils.makeClipAdditive(overlay,0,bindReferenceClip(map));overlay.blendMode=THREE.AdditiveAnimationBlendMode;
 const a=clone(target.scene),b=clone(target.scene),ma=new THREE.AnimationMixer(a),mb=new THREE.AnimationMixer(b);ma.clipAction(base).play();mb.clipAction(base).play();mb.clipAction(overlay).play();ma.setTime(.3);mb.setTime(.3);a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const[name]of anatomy)assert.ok(worldPosition(a,name).distanceTo(worldPosition(b,name))<1e-6);
});

test('skinned clones have independent bones but shared geometry and material',()=>{
 const root=new THREE.Group(),bone=new THREE.Bone(),child=new THREE.Bone();bone.add(child);root.add(bone);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(12),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial());root.add(mesh);mesh.bind(new THREE.Skeleton([bone,child]));const copied=clone(root);const newMesh=copied.children.find(o=>o.isSkinnedMesh);assert.notEqual(newMesh.skeleton.bones[0],mesh.skeleton.bones[0]);assert.equal(newMesh.geometry,mesh.geometry);newMesh.skeleton.bones[0].position.x=2;assert.equal(mesh.skeleton.bones[0].position.x,0);
});

test('explicit naming adapters preserve motion while excluding a non-deforming helper',()=>{
 const source=rig('source'),target=rig('target');
 for(const bone of target.bones.values())bone.name='target_'+bone.name;
 const helper=new THREE.Bone();helper.name='attachment';helper.position.set(0,2,0);target.bones.get('Hand_L').add(helper);
 const options={resolveBone:name=>sourceName(name.slice(7)),skipBone:bone=>bone.name==='attachment'};
 const clip=motion(source),fixed=transferClip(clip,buildRigTransfer(target.scene,source.scene,options),'adapted');
 const sm=new THREE.AnimationMixer(source.scene),tm=new THREE.AnimationMixer(target.scene);sm.clipAction(clip).play();tm.clipAction(fixed).play();sm.setTime(.5);tm.setTime(.5);source.scene.updateMatrixWorld(true);target.scene.updateMatrixWorld(true);
 for(const[name]of anatomy)assert.ok(worldPosition(source.scene,sourceName(name)).distanceTo(worldPosition(target.scene,'target_'+name))<1e-5);
 assert.deepEqual(helper.position.toArray(),[0,2,0]);
 assert.throws(()=>buildRigTransfer(target.scene,source.scene,{resolveBone:()=> 'nonexistent'}),/Unmapped/);
 assert.throws(()=>buildRigTransfer(target.scene,source.scene,{resolveBone:()=> 'Hips'}),/mapped more than once/);
});
