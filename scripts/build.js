const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const files = ['src/content-id.js','src/storage.js','src/tracker.js','src/lampa-adapter.js','src/ui.js','src/settings.js','src/plugin.js'];
let out = '/* Lampa Progress Memory 1.1.0 - generated standalone plugin */\n(function(root){\n\'use strict\';\nvar modules={};\n';
files.forEach((file) => {
  const name = './' + file.replace(/^src\//, '').replace(/\.js$/, '');
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  code = code.replace(/\/\*# source.*?\*\//g, '');
  out += 'modules[' + JSON.stringify(name) + ']=function(module,exports,require){\n' + code + '\n};\n';
});
out += "var cache={};function require(name){if(cache[name])return cache[name].exports;var m={exports:{}};if(!modules[name])throw new Error('Missing module '+name);modules[name](m,m.exports,require);cache[name]=m;return m.exports;}\nvar api=require('./plugin');root.LampaProgressMemory=api;api.init();\n})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));\n";
fs.mkdirSync(path.join(root, 'dist'), {recursive:true});
fs.writeFileSync(path.join(root, 'dist', 'progress.js'), out);
// Keep a root-level copy so GitHub Pages can serve /progress.js directly.
fs.writeFileSync(path.join(root, 'progress.js'), out);
console.log('Built dist/progress.js (' + out.length + ' bytes)');
