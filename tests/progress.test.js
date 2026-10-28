const test = require('node:test');
const assert = require('node:assert/strict');
const {identify,parseEpisode}=require('../src/content-id');
const {Storage}=require('../src/storage');
const {Tracker}=require('../src/tracker');
const {Adapter}=require('../src/lampa-adapter');

function backend(){let d={};return {getItem:k=>d[k]||null,setItem:(k,v)=>d[k]=v};}
test('identifies movie independent of torrent',()=>{const a=identify({type:'movie',tmdb_id:123,title:'X',file:'X.1080p.mkv'});const b=identify({type:'movie',tmdb_id:123,title:'X',file:'X.2160p.mkv',magnet:'different'});assert.equal(a.key,b.key);});
test('identifies episodes from metadata and filename',()=>{assert.equal(identify({type:'tv',tmdb_id:9,season:2,episode:5}).key,'tv:9:s2:e5');assert.deepEqual(parseEpisode('Show.S03E07.mkv'),{season:3,episode:7});});
test('saves, restores and protects lower progress',()=>{const b=backend();let s=new Storage({backend:b});s.put('movie:1',{position:50,duration:100,percent:50,completed:false});s=new Storage({backend:b});assert.equal(s.get('movie:1').position,50);s.put('movie:1',{position:10,duration:100,percent:10,completed:false});assert.equal(s.get('movie:1').position,50);});
test('threshold completion and seek protection',()=>{const s=new Storage({backend:backend()});const t=new Tracker(s,{threshold:90,interval:5,seekProtection:true});t.start({type:'movie',tmdb_id:4});t.update(95,100,'pause');assert.equal(s.get('movie:4').completed,false);t.update(96,100,'pause');t.watched=30;t.persist(true,100);assert.equal(s.get('movie:4').completed,true);});
test('switching episodes keeps separate records',()=>{const s=new Storage({backend:backend()});const t=new Tracker(s,{interval:5});t.start({type:'tv',tmdb_id:7,season:1,episode:1});t.update(20,100,'pause');t.start({type:'tv',tmdb_id:7,season:1,episode:2});t.update(30,100,'pause');assert.equal(s.get('tv:7:s1:e1').position,20);assert.equal(s.get('tv:7:s1:e2').position,30);});
test('export/import',()=>{const a=new Storage({backend:backend()});a.put('movie:2',{position:2,duration:10,percent:20,completed:false});const b=new Storage({backend:backend()});b.import(a.export());assert.equal(b.get('movie:2').position,2);});
test('rejects a TV record without a reliable episode',()=>{assert.equal(identify({type:'tv',tmdb_id:3,title:'No episode'}).valid,false);});
test('keeps high progress when a later event has another duration',()=>{const s=new Storage({backend:backend()});s.put('movie:8',{position:800,duration:1000,percent:80,completed:false});s.put('movie:8',{position:2,duration:900,percent:0.2,completed:false});assert.equal(s.get('movie:8').position,800);});
test('ignores malformed stored records',()=>{const b=backend();b.setItem('lampa_progress_memory_v1',JSON.stringify({version:1,records:{bad:{position:'x'},ok:{position:4,duration:10}}}));const s=new Storage({backend:b});assert.equal(s.get('bad'),null);assert.equal(s.get('ok').position,4);});
test('adapter initialization is idempotent',()=>{const events={};const player={on:(e,f)=>{(events[e]||(events[e]=[])).push(f);},off:()=>{}};const L={Player:player,Listener:{follow:(e,f)=>{(events[e]||(events[e]=[])).push(f);}}};const t={start:()=>{},update:()=>{},stop:()=>{}};const a=new Adapter(L,t);assert.equal(a.init(),true);const n=Object.keys(events).reduce((x,k)=>x+events[k].length,0);assert.equal(a.init(),false);assert.equal(Object.keys(events).reduce((x,k)=>x+events[k].length,0),n);a.destroy();});
