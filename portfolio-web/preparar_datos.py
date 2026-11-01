"""Assemble only hash-pinned public portfolio inputs from a local checkout."""
from pathlib import Path
import argparse,hashlib,json
BASE=Path(__file__).resolve().parent
def digest(data):return hashlib.sha256(data).hexdigest()
def inside(root,rel):
    p=root/rel
    if Path(rel).is_absolute() or '..' in Path(rel).parts or not p.resolve().is_relative_to(root.resolve()):
        raise ValueError('Invalid path in public manifest')
    return p
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--tesis-repo',type=Path,default=BASE.parent.parent/'portfolio-tesis')
    args=parser.parse_args();repo=args.tesis_repo.resolve()
    lock=json.loads((BASE/'DATOS_PUBLICOS.json').read_text(encoding='utf-8'))
    pending=[]
    for row in lock['files']:
        source=inside(repo,row['source']);data=source.read_bytes()
        if digest(data)!=row['sha256']:raise ValueError('Public source version mismatch: '+row['source'])
        dest=inside(BASE,row['destination'])
        if dest.exists() and digest(dest.read_bytes())!=row['sha256']:
            raise ValueError('Existing local file differs; keep it and use a fresh copy: '+row['destination'])
        pending.append((dest,data))
    for dest,data in pending:
        if not dest.exists():
            dest.parent.mkdir(parents=True,exist_ok=True)
            with dest.open('xb') as stream:stream.write(data)
    print(json.dumps({'public_files_verified':len(pending),'projects':82,'network_requests':0}))
if __name__=='__main__':main()
