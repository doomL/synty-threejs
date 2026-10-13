import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {createTextureReuse} from '../assets/shared-textures.js';
function fixture(uri,configure=()=>{}){const texture=new THREE.Texture();configure(texture);const material=new THREE.MeshBasicMaterial({map:texture}),scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),material));const parser={associations:new Map([[texture,{textures:0}]]),json:{textures:[{source:0}],images:[{uri}]}};return{scene,parser,material,texture};}
test('same atlas URL and sampler share one texture and dispose the duplicate',()=>{const reuse=createTextureReuse(),a=fixture('../textures/atlas.png'),b=fixture('../textures/atlas.png');let disposed=0;b.texture.addEventListener('dispose',()=>disposed++);reuse(a,'https://example.test/synty/models/a.glb');reuse(b,'https://example.test/synty/models/b.glb');assert.equal(a.material.map,b.material.map);assert.equal(reuse.count(),1);assert.equal(disposed,1);});
test('different URL, colour space, UV center and sampler remain independent',()=>{
 const reuse=createTextureReuse(),base=fixture('../textures/a.png'),url='https://example.test/one/models/a.glb';reuse(base,url);
 const variants=[
  [fixture('../textures/a.png'),'https://example.test/two/models/b.glb'],
  [fixture('../textures/a.png',t=>t.colorSpace=THREE.SRGBColorSpace),url],
  [fixture('../textures/a.png',t=>t.center.set(.5,.5)),url],
  [fixture('../textures/a.png',t=>t.wrapS=THREE.RepeatWrapping),url],
 ];
 for(const[item,modelURL]of variants){reuse(item,modelURL);assert.notEqual(item.material.map,base.material.map);}
 assert.equal(reuse.count(),5);
});
test('data URIs are not merged by local image index',()=>{const reuse=createTextureReuse(),a=fixture('data:image/png;base64,AAAA'),b=fixture('data:image/png;base64,BBBB');reuse(a,'https://example.test/a.glb');reuse(b,'https://example.test/b.glb');assert.notEqual(a.material.map,b.material.map);assert.equal(reuse.count(),0);});
