import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('bin',{recursive:true});
await build({entryPoints:['App.tsx'],bundle:true,minify:true,legalComments:'eof',target:'chrome110',outfile:'bin/app.js',define:{'process.env.NODE_ENV':'"production"'}});
const js=await readFile('bin/app.js','utf8'),css=await readFile('bin/app.css','utf8');
const html='<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'"><style>'+css+'</style><title>项目备注</title></head><body><div id="root"></div><script>'+js.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
await writeFile('bin/index.html',html);
