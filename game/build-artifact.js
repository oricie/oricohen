#!/usr/bin/env node
// Builds game/artifact.html from game/index.html by inlining every sibling <script src>.
//
// index.html loads its libraries as five separate files. An artifact is a single
// self-contained page with no siblings to fetch, so publishing index.html directly
// yields a blank page: THREE is never defined. This produces the bundle to publish.
//
//   node game/build-artifact.js        # writes game/artifact.html
//   node game/build-artifact.js --check  # exit 1 if the bundle is stale (for CI/hooks)
const fs=require('fs'), path=require('path');
const dir=__dirname;
const SRC=path.join(dir,'index.html'), OUT=path.join(dir,'artifact.html');

const html=fs.readFileSync(SRC,'utf8');
const tagRe=/[ \t]*<script src="([^"]+)"><\/script>\n?/g;
const missing=[];
let inlined=0;
const bundle=html.replace(tagRe,(m,src)=>{
  const p=path.join(dir,src);
  if(!fs.existsSync(p)){missing.push(src);return m;}
  inlined++;
  // No template literals here: the library sources contain ${...} and backticks.
  return '<script>\n/* inlined from '+src+' */\n'+fs.readFileSync(p,'utf8')+'\n</script>\n';
});

if(missing.length){console.error('missing script(s): '+missing.join(', '));process.exit(1);}
if(!inlined){console.error('no <script src> tags found — has index.html changed shape?');process.exit(1);}
if(/<script src="/.test(bundle)){console.error('a <script src> survived inlining');process.exit(1);}

if(process.argv.includes('--check')){
  const cur=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8'):'';
  if(cur!==bundle){console.error('artifact.html is STALE — run: node game/build-artifact.js');process.exit(1);}
  console.log('artifact.html is up to date');process.exit(0);
}
fs.writeFileSync(OUT,bundle);
console.log('artifact.html: inlined '+inlined+' scripts, '+(bundle.length/1048576).toFixed(2)+' MB');
