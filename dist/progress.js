/* Lampa Progress Memory 1.0.0 - generated standalone plugin */
(function(root){
'use strict';
var modules={};
modules["./content-id"]=function(module,exports,require){
'use strict';

function number(value) {
  var n = Number(value);
  return isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function pick(obj, keys) {
  if (!obj) return null;
  for (var i = 0; i < keys.length; i++) if (obj[keys[i]] != null && obj[keys[i]] !== '') return obj[keys[i]];
  return null;
}

function parseEpisode(text) {
  if (!text) return {};
  var s = String(text);
  var m = s.match(/[Ss](?:eason)?\s*0?(\d{1,3})\s*[Ee](?:pisode)?\s*0?(\d{1,3})/i);
  if (m) return {season: Number(m[1]), episode: Number(m[2])};
  m = s.match(/(?:^|[\s._-])[Ss](\d{1,3})[ ._-]?[Ee](\d{1,3})(?:$|[\s._-])/i);
  if (m) return {season: Number(m[1]), episode: Number(m[2])};
  return {};
}

function identify(input) {
  input = input || {};
  var data = input.data || input.card || input.object || input;
  var media = input.media || data.media || {};
  var tmdbId = number(pick(data, ['tmdb_id','tmdbId','id_tmdb'])) || number(pick(media, ['tmdb_id','tmdbId','id_tmdb']));
  var type = String(pick(data, ['type','media_type','contentType']) || pick(media, ['type','media_type']) || '').toLowerCase();
  if (type === 'movie' || type === 'film') type = 'movie';
  else if (type === 'tv' || type === 'show' || type === 'serial' || type === 'series') type = 'tv';
  else type = (pick(data, ['seasons','number_of_seasons','first_air_date']) || pick(input, ['season','season_number','episode','episode_number'])) ? 'tv' : 'movie';
  var season = number(pick(input, ['season','season_number'])) || number(pick(data, ['season','season_number'])) || number(pick(media, ['season','season_number']));
  var episode = number(pick(input, ['episode','episode_number'])) || number(pick(data, ['episode','episode_number'])) || number(pick(media, ['episode','episode_number']));
  var texts = [pick(input, ['file','filename','name']), pick(data, ['file','filename','name','title']), pick(media, ['file','filename','name'])];
  for (var i = 0; i < texts.length && !(season && episode); i++) {
    var parsed = parseEpisode(texts[i]);
    if (!season) season = parsed.season;
    if (!episode) episode = parsed.episode;
  }
  if (type === 'movie' && season && episode) type = 'tv';
  var stable = tmdbId ? String(tmdbId) : null;
  if (!stable) {
    var fallback = pick(data, ['kinopoisk_id','kp_id','imdb_id']) || pick(input, ['contentId','stableId']);
    if (fallback) stable = String(fallback);
  }
  if (!stable) return {valid:false, reason:'missing-id'};
  if (type === 'tv') {
    if (!season || !episode) return {valid:false, reason:'missing-episode', contentType:'tv', tmdbId:tmdbId, stableId:stable};
    return {valid:true, contentType:'tv', tmdbId:tmdbId, stableId:stable, season:season, episode:episode, key:'tv:'+stable+':s'+season+':e'+episode, title:pick(data,['title','name']) || ''};
  }
  return {valid:true, contentType:'movie', tmdbId:tmdbId, stableId:stable, key:'movie:'+stable, title:pick(data,['title','name']) || ''};
}

module.exports = {identify:identify, parseEpisode:parseEpisode};

};
modules["./storage"]=function(module,exports,require){
'use strict';

var KEY = 'lampa_progress_memory_v1';
function safeParse(value) { try { return JSON.parse(value); } catch (e) { return null; } }
function Storage(options) {
  options = options || {};
  this.backend = options.backend || (typeof localStorage !== 'undefined' ? localStorage : null);
  this.lampa = options.lampa || (typeof window !== 'undefined' ? window.Lampa : null);
  this.key = options.key || KEY;
  this.memory = options.memory || null;
  this.state = this.load();
}
Storage.prototype.load = function() {
  var raw = null;
  try {
    if (this.lampa && this.lampa.Storage && this.lampa.Storage.get) raw = this.lampa.Storage.get(this.key);
    if (!raw && this.backend && this.backend.getItem) raw = this.backend.getItem(this.key);
  } catch (e) {}
  if (typeof raw === 'string') raw = safeParse(raw);
  if (!raw || typeof raw !== 'object') raw = {version:1, records:{}};
  if (!raw.records || typeof raw.records !== 'object') raw.records = {};
  var clean = {};
  Object.keys(raw.records).forEach(function(k) {
    var r = raw.records[k];
    if (!r || typeof r !== 'object' || typeof r.position !== 'number' || !isFinite(r.position)) return;
    r.position = Math.max(0, r.position);
    if (r.duration != null && (!isFinite(Number(r.duration)) || Number(r.duration) <= 0)) r.duration = null;
    if (r.percent == null && r.duration) r.percent = Math.max(0, Math.min(100, r.position / r.duration * 100));
    r.percent = Math.max(0, Math.min(100, Number(r.percent) || 0));
    r.completed = !!r.completed;
    clean[k] = r;
  });
  raw.version = 1; raw.records = clean;
  return raw;
};
Storage.prototype.save = function() {
  var value = JSON.stringify(this.state);
  try {
    if (this.lampa && this.lampa.Storage && this.lampa.Storage.set) this.lampa.Storage.set(this.key, value);
    else if (this.backend && this.backend.setItem) this.backend.setItem(this.key, value);
    else this.memory = value;
  } catch (e) { this.memory = value; }
};
Storage.prototype.get = function(key) { return this.state.records[key] || null; };
Storage.prototype.all = function() { var out={}; Object.keys(this.state.records).forEach(function(k){out[k]=this.state.records[k];}); return out; };
Storage.prototype.put = function(key, record) {
  if (!key || !record) return null;
  var old = this.state.records[key];
  if (old && old.position > (record.position || 0)) {
    record.position = old.position; record.percent = Math.max(Number(old.percent)||0, Number(record.percent)||0); record.completed = old.completed || record.completed;
  }
  record.updatedAt = Date.now();
  this.state.records[key] = record; this.save(); return record;
};
Storage.prototype.remove = function(key) { delete this.state.records[key]; this.save(); };
Storage.prototype.clear = function() { this.state.records = {}; this.save(); };
Storage.prototype.export = function() { return JSON.stringify({version:1, exportedAt:Date.now(), records:this.state.records}, null, 2); };
Storage.prototype.import = function(value, merge) {
  var parsed = typeof value === 'string' ? safeParse(value) : value;
  if (!parsed || !parsed.records || typeof parsed.records !== 'object') throw new Error('Invalid progress export');
  var self=this; Object.keys(parsed.records).forEach(function(k){ var r=parsed.records[k]; if (!r || typeof r !== 'object' || typeof r.position !== 'number') return; if (!merge || !self.state.records[k] || self.state.records[k].updatedAt < (r.updatedAt||0)) self.state.records[k]=r; }); this.save();
};
module.exports = {Storage:Storage, KEY:KEY};

};
modules["./tracker"]=function(module,exports,require){
'use strict';
var content = require('./content-id');
function Tracker(storage, options) {
  this.storage=storage; this.options=options||{}; this.interval=Number(this.options.interval)||15; this.threshold=Number(this.options.threshold)||90; this.seekProtection=this.options.seekProtection !== false; this.current=null; this.timer=null; this.lastPersist=0; this.watched=0; this.lastPosition=0; this.lastTimestamp=0; this.listeners=0;
}
Tracker.prototype.configure=function(opts){opts=opts||{};if(opts.interval!=null)this.interval=Math.max(5,Number(opts.interval)||15);if(opts.threshold!=null)this.threshold=Math.max(75,Math.min(99,Number(opts.threshold)||90));if(opts.seekProtection!=null)this.seekProtection=!!opts.seekProtection;};
Tracker.prototype.start=function(meta){var id=content.identify(meta);if(!id.valid){this.stop(false);return null;}this.current=id;this.watched=0;this.lastPosition=0;this.lastTimestamp=Date.now();var old=this.storage.get(id.key);if(old)this.lastPosition=old.position||0;this.stopTimer();var self=this;this.timer=setInterval(function(){self.persist(false);},this.interval*1000);if(this.timer.unref)this.timer.unref();return id;};
Tracker.prototype.update=function(position,duration,kind){if(!this.current || !isFinite(Number(position)))return null;position=Math.max(0,Number(position));duration=isFinite(Number(duration))&&Number(duration)>0?Number(duration):null;var now=Date.now(), delta=position-this.lastPosition;
  // A large discontinuity is normally a seek. Count only small, continuous advances as watched time.
  if(delta>0 && (!this.seekProtection || delta<=15)) this.watched+=delta;
  this.lastPosition=Math.max(this.lastPosition,position); this.lastTimestamp=now; if(kind==='pause'||kind==='stop'||kind==='ended') return this.persist(true,duration); return this.storage.get(this.current.key);};
Tracker.prototype.persist=function(force,duration){if(!this.current)return null;var now=Date.now();if(!force&&now-this.lastPersist<this.interval*1000-200)return this.storage.get(this.current.key);var old=this.storage.get(this.current.key)||{};var pos=Math.max(Number(old.position)||0,Number(this.lastPosition)||0);duration=duration||old.duration||null;var percent=duration?Math.max(0,Math.min(100,pos/duration*100)):Number(old.percent)||0;var completed=percent>=this.threshold; if(this.seekProtection&&duration&&percent>=this.threshold&&this.watched<Math.max(30,duration*0.05)&&!old.completed) completed=false; var rec={contentType:this.current.contentType,tmdbId:this.current.tmdbId||null,stableId:this.current.stableId,title:this.current.title||old.title||'',season:this.current.season||null,episode:this.current.episode||null,position:pos,duration:duration,percent:percent,completed:completed,player:this.options.player||'internal'};this.storage.put(this.current.key,rec);this.lastPersist=now;return rec;};
Tracker.prototype.stop=function(save){this.stopTimer();if(save!==false)this.persist(true);this.current=null;};
Tracker.prototype.stopTimer=function(){if(this.timer){clearInterval(this.timer);this.timer=null;}};
Tracker.prototype.mark=function(meta,completed){var id=content.identify(meta);if(!id.valid)return null;var old=this.storage.get(id.key)||{};var duration=Number(meta.duration||old.duration)||null;var rec={contentType:id.contentType,tmdbId:id.tmdbId||null,stableId:id.stableId,title:id.title||old.title||'',season:id.season||null,episode:id.episode||null,position:completed&&duration?duration:(old.position||0),duration:duration,percent:completed?100:(old.percent||0),completed:!!completed,player:'manual'};return this.storage.put(id.key,rec);};
Tracker.prototype.setProgress=function(meta,percent,duration){var id=content.identify(meta);if(!id.valid)return null;var old=this.storage.get(id.key)||{};duration=Number(duration||meta.duration||old.duration)||null;percent=Math.max(0,Math.min(100,Number(percent)||0));var position=duration?duration*percent/100:(old.position||0);return this.storage.put(id.key,{contentType:id.contentType,tmdbId:id.tmdbId||null,stableId:id.stableId,title:id.title||old.title||'',season:id.season||null,episode:id.episode||null,position:position,duration:duration,percent:percent,completed:percent>=this.threshold,player:'manual'});};
module.exports={Tracker:Tracker};

};
modules["./lampa-adapter"]=function(module,exports,require){
'use strict';
function Adapter(lampa, tracker, options) { this.Lampa=lampa||{}; this.tracker=tracker; this.options=options||{}; this.bound=false; this.handlers=[]; }
Adapter.prototype.on=function(target,event,fn){if(!target||!target.on)return false;try{target.on(event,fn);this.handlers.push({target:target,event:event,fn:fn});return true;}catch(e){return false;}};
Adapter.prototype.init=function(){if(this.bound)return false;this.bound=true;var L=this.Lampa,self=this;var player=L.Player||L.PlayerVideo||null;this.on(player,'start',function(e){if(e&&e.data)self.tracker.start(e.data);});this.on(player,'timeupdate',function(e){var d=e&&e.data||e||{};self.tracker.update(d.position!=null?d.position:d.time,d.duration,'timeupdate');});this.on(player,'pause',function(e){var d=e&&e.data||e||{};self.tracker.update(d.position!=null?d.position:d.time,d.duration,'pause');});this.on(player,'stop',function(e){var d=e&&e.data||e||{};self.tracker.update(d.position!=null?d.position:d.time,d.duration,'stop');self.tracker.stop(true);});this.on(player,'ended',function(e){var d=e&&e.data||e||{};self.tracker.update(d.position!=null?d.position:d.time,d.duration,'ended');self.tracker.stop(true);});
  this.on(L,'player',function(e){var d=e&&e.data||e||{};if(d.action==='start'||d.action==='play')self.tracker.start(d);});
  if(L.Listener&&L.Listener.follow){['player','player_start','player_pause','player_stop','player_end','torrent','vimu'].forEach(function(name){try{L.Listener.follow(name,function(e){var d=e&&e.data||e||{};if(name==='player_start'||d.action==='start'||d.action==='play')self.tracker.start(d);var p=d.position!=null?d.position:d.time;if(p!=null){var kind=(name.indexOf('pause')>=0?'pause':(name.indexOf('stop')>=0?'stop':(name.indexOf('end')>=0?'ended':'timeupdate')));self.tracker.update(p,d.duration,kind);if(kind==='stop'||kind==='ended')self.tracker.stop(true);}});}catch(e){}});}
  return true;};
Adapter.prototype.destroy=function(){this.handlers.forEach(function(h){try{if(h.target.off)h.target.off(h.event,h.fn);}catch(e){}});this.handlers=[];this.bound=false;};
module.exports={Adapter:Adapter};

};
modules["./ui"]=function(module,exports,require){
'use strict';
function UI(Lampa, storage, tracker, settings) { this.Lampa=Lampa||{}; this.storage=storage; this.tracker=tracker; this.settings=settings; this.bound=false; }
UI.prototype.summary=function(meta){var all=this.storage.all(), key=meta&&meta.key, rec=key?all[key]:null; if(!rec)return null;return {text:rec.completed?'Просмотрено':'Просмотрено '+Math.round(rec.percent||0)+'%',record:rec};};
UI.prototype.init=function(){if(this.bound)return false;this.bound=true;var L=this.Lampa,self=this;var listener=L.Listener||null;if(listener&&listener.follow){try{listener.follow('full',function(e){var d=e&&e.data||e||{};self.decorate(d);});}catch(e){}} if(L.Component&&L.Component.Listener){try{L.Component.Listener.follow('card',function(e){self.decorate(e&&e.data||e||{});});}catch(e){}}return true;};
UI.prototype.decorate=function(card){if(!this.settings.get('showCards'))return;var meta=card&& (card.card||card.movie||card);if(!meta)return;var id=require('./content-id').identify(meta);if(!id.valid)return;var rec=this.storage.get(id.key);if(!rec)return;var text='Progress Memory: '+(rec.completed?'Просмотрено':Math.round(rec.percent||0)+'%');try{if(card.append)card.append('<div class="lpm-progress">'+text+'</div>');else if(card.el){var node=card.el.querySelector&&card.el.querySelector('.lpm-progress');if(!node&&card.el.ownerDocument){node=card.el.ownerDocument.createElement('div');node.className='lpm-progress';card.el.appendChild(node);}if(node)node.textContent=text;}}catch(e){}};
module.exports={UI:UI};

};
modules["./settings"]=function(module,exports,require){
'use strict';
var DEFAULTS={enabled:true,threshold:90,seekProtection:true,interval:15,showCards:true,showSeasons:true,diagnostic:false};
function Settings(Lampa){this.Lampa=Lampa||{};this.key='lampa_progress_memory_settings';this.values={};this.load();}
Settings.prototype.load=function(){var raw=null;try{if(this.Lampa.Storage&&this.Lampa.Storage.get)raw=this.Lampa.Storage.get(this.key);}catch(e){}if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){raw=null;}}this.values={};Object.keys(DEFAULTS).forEach(function(k){this.values[k]=raw&&raw[k]!==undefined?raw[k]:DEFAULTS[k];},this);};
Settings.prototype.get=function(k){return this.values[k];};
Settings.prototype.set=function(k,v){if(!(k in DEFAULTS))return;this.values[k]=v;try{if(this.Lampa.Storage&&this.Lampa.Storage.set)this.Lampa.Storage.set(this.key,JSON.stringify(this.values));}catch(e){}};
Settings.prototype.all=function(){var o={};Object.keys(this.values).forEach(function(k){o[k]=this.values[k];});return o;};
Settings.prototype.init=function(){var L=this.Lampa;if(!L.SettingsApi||!L.SettingsApi.addComponent)return false;try{var self=this;L.SettingsApi.addComponent({component:'progress_memory',name:'Progress Memory',settings:[{name:'threshold',type:'select',values:{75:'75%',80:'80%',85:'85%',90:'90%',95:'95%',99:'99%'},default:this.get('threshold'),onChange:function(v){self.set('threshold',Number(v));}},{name:'interval',type:'select',values:{10:'10 сек',15:'15 сек',30:'30 сек'},default:this.get('interval'),onChange:function(v){self.set('interval',Number(v));}}]});return true;}catch(e){return false;}};
module.exports={Settings:Settings,DEFAULTS:DEFAULTS};

};
modules["./plugin"]=function(module,exports,require){
'use strict';
var Storage=require('./storage').Storage, Tracker=require('./tracker').Tracker, Adapter=require('./lampa-adapter').Adapter, UI=require('./ui').UI, Settings=require('./settings').Settings;
var api={version:'1.0.0',storage:null,tracker:null,settings:null,adapter:null,ui:null,initialized:false};
api.init=function(root){if(api.initialized)return api;root=root||((typeof window!=='undefined')?window:{});var L=root.Lampa||{};api.settings=new Settings(L);api.storage=new Storage({lampa:L});api.tracker=new Tracker(api.storage,{threshold:api.settings.get('threshold'),interval:api.settings.get('interval'),seekProtection:api.settings.get('seekProtection')});api.adapter=new Adapter(L,api.tracker);api.adapter.init();api.ui=new UI(L,api.storage,api.tracker,api.settings);api.ui.init();api.settings.init();api.initialized=true;return api;};
api.identify=require('./content-id').identify;
api.get=function(key){return api.storage&&api.storage.get(key);};
api.export=function(){return api.storage.export();};
api.import=function(v,merge){return api.storage.import(v,merge!==false);};
api.clear=function(){return api.storage.clear();};
api.mark=function(meta,done){return api.tracker.mark(meta,done);};
api.setProgress=function(meta,percent,duration){return api.tracker.setProgress(meta,percent,duration);};
api.remove=function(meta){var id=require('./content-id').identify(meta);if(id.valid&&api.storage){api.storage.remove(id.key);return true;}return false;};
module.exports=api;

};
var cache={};function require(name){if(cache[name])return cache[name].exports;var m={exports:{}};if(!modules[name])throw new Error('Missing module '+name);modules[name](m,m.exports,require);cache[name]=m;return m.exports;}
var api=require('./plugin');root.LampaProgressMemory=api;api.init();
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
