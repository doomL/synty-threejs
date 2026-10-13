import base64, importlib.util, json, struct, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('share',Path(__file__).resolve().parents[1]/'scripts/share_glb_textures.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
# Synthetic 1x1 PNG and synthetic vertex floats; no Synty content.
IMAGE=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=')
GEOMETRY=struct.pack('<fff',1.,2.,3.)

def fixture(extra=None):
 image_padded=IMAGE+b'\0'*(-len(IMAGE)%4);binary=image_padded+GEOMETRY
 doc={'asset':{'version':'2.0'},'buffers':[{'byteLength':len(binary)}], 'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(IMAGE)},{'buffer':0,'byteOffset':len(image_padded),'byteLength':len(GEOMETRY)}], 'images':[{'bufferView':0,'mimeType':'image/png'}], 'accessors':[{'bufferView':1,'componentType':5126,'type':'VEC3','count':1}], 'meshes':[{'primitives':[{'attributes':{'POSITION':0}}]}]}
 if extra:doc.update(extra)
 return module.encode_glb(doc,binary)

class TexturesTest(unittest.TestCase):
 def test_original_geometry_image_and_accessor_are_preserved(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);source=root/'source.glb';original=fixture();source.write_bytes(original);out=root/'project/models/a.glb';textures=root/'project/textures';result=module.extract(source,out,textures)
   self.assertEqual(source.read_bytes(),original);self.assertEqual(result['shared_images'],1)
   _,doc,binary=module.read_glb(out);self.assertEqual(doc['accessors'][0]['bufferView'],0);self.assertEqual(binary[:12],GEOMETRY)
   image=(out.parent/doc['images'][0]['uri']).resolve();self.assertEqual(image.read_bytes(),IMAGE)
   second=root/'project/models/b.glb';module.extract(source,second,textures);self.assertEqual(len(list(textures.iterdir())),1)
 def test_in_place_overwrite_and_existing_destination_are_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);source=root/'source.glb';source.write_bytes(fixture())
   with self.assertRaisesRegex(ValueError,'immutable'):module.extract(source,source,root/'textures')
   out=root/'out.glb';out.write_bytes(b'existing')
   with self.assertRaisesRegex(ValueError,'already exists'):module.extract(source,out,root/'textures')
   self.assertEqual(out.read_bytes(),b'existing')
 def test_unsupported_extensions_and_truncation_leave_no_output(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);source=root/'source.glb';source.write_bytes(fixture({'extensions':{'EXT_meshopt_compression':{}}}));out=root/'out.glb'
   with self.assertRaisesRegex(ValueError,'extension'):module.extract(source,out,root/'textures')
   self.assertFalse(out.exists());self.assertFalse((root/'textures').exists())
   source.write_bytes(fixture()[:-3])
   with self.assertRaisesRegex(ValueError,'complete'):module.extract(source,out,root/'textures')
 def test_shared_image_view_referenced_as_geometry_is_rejected(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);source=root/'source.glb';source.write_bytes(fixture({'accessors':[{'bufferView':0,'componentType':5126,'type':'SCALAR','count':1}]}))
   with self.assertRaisesRegex(ValueError,'also referenced'):module.extract(source,root/'out.glb',root/'textures')
   self.assertFalse((root/'textures').exists())

if __name__=='__main__':unittest.main()
