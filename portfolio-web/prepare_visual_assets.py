"""Web thumbnails of existing conceptual illustrations; originals stay untouched."""
import hashlib, json
from pathlib import Path
from PIL import Image

BASE=Path(__file__).resolve().parent
def main():
    target=BASE/'web/media/thumbnails';target.mkdir(parents=True,exist_ok=True)
    entries=[]
    for p in sorted((BASE/'public-sources').glob('*/proyecto.png')):
        dest=target/(p.parent.name+'.webp')
        with Image.open(p) as source:
            image=source.convert('RGB');image.thumbnail((640,440))
            image.save(dest,'WEBP',quality=80,method=6)
        entries.append({'project_id':p.parent.name,'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'thumbnail_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size})
    assert len(entries)==82
    (BASE/'review').mkdir(parents=True,exist_ok=True)
    (BASE/'review/thumbnail_manifest.json').write_text(json.dumps({'operation':'resize and WebP encode, no creative editing or new generation','tool':'Pillow','originals_modified':False,'images':entries},indent=2),encoding='utf-8')
    print(json.dumps({'thumbnails':len(entries),'total_bytes':sum(x['bytes'] for x in entries)}))
if __name__=='__main__':main()
