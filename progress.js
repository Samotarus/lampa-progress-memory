/* Lampa Progress Memory 1.1.3 - generated standalone plugin */
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
  var data = input.data || input.object || input;
  // Player:start carries the TMDB card in `movie` and playback fields next to it.
  // Keep the card's id while accepting season/file fields from the outer event.
  if ((input.movie || input.card || data.movie || data.card) && (data === input || data.movie || data.card)) {
    var sourceCard = input.movie || input.card || data.movie || data.card;
    var merged = {};
    Object.keys(sourceCard).forEach(function(k){ merged[k] = sourceCard[k]; });
    ['season','season_number','episode','episode_number','file','filename','path','name','title'].forEach(function(k){ if(input[k] != null && merged[k] == null) merged[k] = input[k]; });
    data = merged;
  }
  var media = input.media || data.media || {};
  var tmdbId = number(pick(data, ['tmdb_id','tmdbId','id_tmdb','id'])) || number(pick(media, ['tmdb_id','tmdbId','id_tmdb','id']));
  var type = String(pick(data, ['type','media_type','contentType']) || pick(media, ['type','media_type']) || '').toLowerCase();
  if (type === 'movie' || type === 'film') type = 'movie';
  else if (type === 'tv' || type === 'show' || type === 'serial' || type === 'series') type = 'tv';
  else type = (pick(data, ['seasons','number_of_seasons','first_air_date']) || pick(input, ['season','season_number','episode','episode_number'])) ? 'tv' : 'movie';
  var season = number(pick(input, ['season','season_number'])) || number(pick(data, ['season','season_number'])) || number(pick(media, ['season','season_number']));
  var episode = number(pick(input, ['episode','episode_number'])) || number(pick(data, ['episode','episode_number'])) || number(pick(media, ['episode','episode_number']));
  var texts = [pick(input, ['file','filename','path','name']), pick(data, ['file','filename','path','name','title']), pick(media, ['file','filename','name'])];
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
Storage.prototype.all = function() { var out={}, self=this; Object.keys(this.state.records).forEach(function(k){out[k]=self.state.records[k];}); return out; };
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
  this.storage=storage; this.options=options||{}; this.interval=Number(this.options.interval)||15; this.threshold=Number(this.options.threshold)||90; this.seekProtection=this.options.seekProtection !== false; this.current=null; this.lastMeta=null; this.timer=null; this.lastPersist=0; this.watched=0; this.lastPosition=0; this.lastDuration=null; this.lastTimestamp=0; this.listeners=0; this.lastError=''; this.events=0;
}
Tracker.prototype.configure=function(opts){opts=opts||{};if(opts.interval!=null)this.interval=Math.max(5,Number(opts.interval)||15);if(opts.threshold!=null)this.threshold=Math.max(75,Math.min(99,Number(opts.threshold)||90));if(opts.seekProtection!=null)this.seekProtection=!!opts.seekProtection;};
Tracker.prototype.start=function(meta){var id=content.identify(meta);if(!id.valid){this.lastError='Не удалось определить TMDB ID/серию: '+id.reason;this.stop(false);return null;}if(this.current)this.persist(true);this.stopTimer();this.current=id;this.lastMeta=id;this.watched=0;this.lastPosition=0;this.lastDuration=null;this.lastTimestamp=Date.now();var old=this.storage.get(id.key);if(old)this.lastPosition=old.position||0;var self=this;this.timer=setInterval(function(){self.persist(false);},this.interval*1000);if(this.timer.unref)this.timer.unref();return id;};
Tracker.prototype.update=function(position,duration,kind){if(!this.current || !isFinite(Number(position)))return null;position=Math.max(0,Number(position));duration=isFinite(Number(duration))&&Number(duration)>0?Number(duration):null;var now=Date.now(), delta=position-this.lastPosition;this.events++;this.lastDuration=duration||this.lastDuration;
  // A large discontinuity is normally a seek. Count only small, continuous advances as watched time.
  if(delta>0 && (!this.seekProtection || delta<=15)) this.watched+=delta;
  this.lastPosition=Math.max(this.lastPosition,position); this.lastTimestamp=now; if(kind==='pause'||kind==='stop'||kind==='ended') return this.persist(true,duration); return this.storage.get(this.current.key);};
Tracker.prototype.persist=function(force,duration){if(!this.current)return null;var now=Date.now();if(!force&&now-this.lastPersist<this.interval*1000-200)return this.storage.get(this.current.key);var old=this.storage.get(this.current.key)||{};var pos=Math.max(Number(old.position)||0,Number(this.lastPosition)||0);duration=duration||this.lastDuration||old.duration||null;var percent=duration?Math.max(0,Math.min(100,pos/duration*100)):Number(old.percent)||0;var completed=percent>=this.threshold; if(this.seekProtection&&duration&&percent>=this.threshold&&this.watched<Math.max(30,duration*0.05)&&!old.completed) completed=false; var rec={contentType:this.current.contentType,tmdbId:this.current.tmdbId||null,stableId:this.current.stableId,title:this.current.title||old.title||'',season:this.current.season||null,episode:this.current.episode||null,position:pos,duration:duration,percent:percent,completed:completed,player:this.options.player||'internal'};this.storage.put(this.current.key,rec);this.lastPersist=now;return rec;};
Tracker.prototype.flush=function(duration){return this.persist(true,duration);};
Tracker.prototype.diagnostics=function(){var c=this.current||this.lastMeta||{};return {lastMeta:c.valid?c:null,tmdbId:c.tmdbId||null,season:c.season||null,episode:c.episode||null,position:this.lastPosition||0,duration:this.lastDuration||null,records:Object.keys(this.storage.all()).length,lastError:this.lastError||'' ,events:this.events};};
Tracker.prototype.stop=function(save){this.stopTimer();if(save!==false)this.persist(true);this.current=null;};
Tracker.prototype.stopTimer=function(){if(this.timer){clearInterval(this.timer);this.timer=null;}};
Tracker.prototype.mark=function(meta,completed){var id=content.identify(meta);if(!id.valid)return null;var old=this.storage.get(id.key)||{};var duration=Number(meta.duration||old.duration)||null;var rec={contentType:id.contentType,tmdbId:id.tmdbId||null,stableId:id.stableId,title:id.title||old.title||'',season:id.season||null,episode:id.episode||null,position:completed&&duration?duration:(old.position||0),duration:duration,percent:completed?100:(old.percent||0),completed:!!completed,player:'manual'};return this.storage.put(id.key,rec);};
Tracker.prototype.setProgress=function(meta,percent,duration){var id=content.identify(meta);if(!id.valid)return null;var old=this.storage.get(id.key)||{};duration=Number(duration||meta.duration||old.duration)||null;percent=Math.max(0,Math.min(100,Number(percent)||0));var position=duration?duration*percent/100:(old.position||0);return this.storage.put(id.key,{contentType:id.contentType,tmdbId:id.tmdbId||null,stableId:id.stableId,title:id.title||old.title||'',season:id.season||null,episode:id.episode||null,position:position,duration:duration,percent:percent,completed:percent>=this.threshold,player:'manual'});};
module.exports={Tracker:Tracker};

};
modules["./lampa-adapter"]=function(module,exports,require){
'use strict';
// Adapter for documented Lampa buses. PlayerVideo is recreated for every session.
function Adapter(lampa, tracker, options) { this.Lampa=lampa||{}; this.tracker=tracker; this.options=options||{}; this.bound=false; this.playerBound=false; this.globalBound=false; this.handlers=[]; this.videoHandlers=[]; this.lastStart=null; this.bindTimer=null; this.coreTimer=null; this.coreAttempts=0; }
Adapter.prototype.follow=function(bus,event,fn,list){if(!bus||typeof bus.follow!=='function')return false;try{bus.follow(event,fn);(list||this.handlers).push({bus:bus,event:event,fn:fn});return true;}catch(e){this.tracker.lastError=String(e.message||e);return false;}};
Adapter.prototype.remove=function(item){try{if(item.dom&&item.target&&item.target.removeEventListener)item.target.removeEventListener(item.event,item.fn);else if(item.bus&&typeof item.bus.remove==='function')item.bus.remove(item.event,item.fn);else if(item.bus&&typeof item.bus.off==='function')item.bus.off(item.event,item.fn);}catch(e){}};
Adapter.prototype.unwrap=function(e){return e&&e.data&&typeof e.data==='object'?e.data:(e||{});};
Adapter.prototype.meta=function(data){data=data||{};var L=this.Lampa,activity=null;try{activity=L.Activity&&typeof L.Activity.active==='function'?L.Activity.active():null;}catch(e){}var active=activity&&(activity.card_data||activity.card||activity.movie);var card=data.movie||data.card||(data.object&&data.object.card)||active||data,out={};Object.keys(data).forEach(function(k){out[k]=data[k];});out.movie=card;out.card=card;if(out.season==null&&out.season_number==null&&active){out.season=active.season;out.season_number=active.season_number;}if(out.episode==null&&out.episode_number==null&&active){out.episode=active.episode;out.episode_number=active.episode_number;}return out;};
Adapter.prototype.videoElement=function(){var p=this.Lampa.PlayerVideo;if(!p)return null;try{if(typeof p.video==='function')return p.video();if(p.video&&typeof p.video.addEventListener==='function')return p.video;}catch(e){}return null;};
Adapter.prototype.bindVideo=function(){var self=this,L=this.Lampa;this.unbindVideo();var v=L.PlayerVideo&&L.PlayerVideo.listener, bound=false;
  if(v){bound=this.follow(v,'timeupdate',function(e){var d=self.unwrap(e),el=self.videoElement();self.tracker.update(d.current!=null?d.current:(d.position!=null?d.position:(el&&el.currentTime)),d.duration||(el&&el.duration),'timeupdate');},this.videoHandlers)||bound;this.follow(v,'loadeddata',function(e){var d=self.unwrap(e),el=self.videoElement();if(d.current!=null||el)self.tracker.update(d.current!=null?d.current:el.currentTime,d.duration||(el&&el.duration),'timeupdate');},this.videoHandlers);this.follow(v,'pause',function(e){var d=self.unwrap(e),el=self.videoElement();self.tracker.update(d.current!=null?d.current:(el&&el.currentTime!=null?el.currentTime:self.tracker.lastPosition),d.duration||(el&&el.duration),'pause');},this.videoHandlers);this.follow(v,'ended',function(e){var d=self.unwrap(e),el=self.videoElement();self.tracker.update(d.current!=null?d.current:(el&&el.currentTime!=null?el.currentTime:self.tracker.lastPosition),d.duration||(el&&el.duration),'ended');self.tracker.stop(true);},this.videoHandlers);}
  var el=this.videoElement();if(el&&typeof el.addEventListener==='function'){var onTime=function(){self.tracker.update(el.currentTime,el.duration,'timeupdate');},onLoaded=function(){self.tracker.update(el.currentTime,el.duration,'timeupdate');},onPause=function(){self.tracker.update(el.currentTime,el.duration,'pause');},onEnded=function(){self.tracker.update(el.currentTime,el.duration,'ended');self.tracker.stop(true);};[['timeupdate',onTime],['loadeddata',onLoaded],['pause',onPause],['ended',onEnded]].forEach(function(pair){try{el.addEventListener(pair[0],pair[1]);self.videoHandlers.push({dom:true,target:el,event:pair[0],fn:pair[1]});bound=true;}catch(e){self.tracker.lastError=String(e.message||e);}});}
  return bound;};
Adapter.prototype.unbindVideo=function(){var self=this;this.videoHandlers.forEach(function(h){self.remove(h);});this.videoHandlers=[];};
Adapter.prototype.scheduleVideoBind=function(attempt){var self=this;if(this.bindTimer||!this.bound)return;if((attempt||0)>30)return;this.bindTimer=setTimeout(function(){self.bindTimer=null;if(!self.bound)return;if(!self.bindVideo())self.scheduleVideoBind((attempt||0)+1);},200);if(this.bindTimer.unref)this.bindTimer.unref();};
Adapter.prototype.bindPlayer=function(){if(this.playerBound)return true;var L=this.Lampa,self=this,p=L.Player&&L.Player.listener;if(!p)return false;var ok=true;ok=this.follow(p,'start',function(e){var d=self.unwrap(e);self.lastStart=d;var id=self.tracker.start(self.meta(d));if(!id)self.tracker.lastError='Player:start получен, но карточка/эпизод не распознаны';self.bindVideo();self.scheduleVideoBind(0);})&&ok;ok=this.follow(p,'destroy',function(){self.tracker.stop(true);self.unbindVideo();})&&ok;ok=this.follow(p,'close',function(){self.tracker.stop(true);})&&ok;ok=this.follow(p,'external',function(e){var d=self.unwrap(e);self.lastStart=d;self.tracker.options.player=d.launch_player||'external';})&&ok;ok=this.follow(p,'ready',function(e){var d=self.unwrap(e);if(d.timeline&&d.timeline.time!=null)self.tracker.update(d.timeline.time,d.timeline.duration,'timeupdate');self.bindVideo();self.scheduleVideoBind(0);})&&ok;this.playerBound=ok;return ok;};
Adapter.prototype.schedulePlayerBind=function(){var self=this;if(this.playerBound||this.coreTimer||!this.bound)return;if(this.coreAttempts++>40)return;this.coreTimer=setTimeout(function(){self.coreTimer=null;if(!self.bindPlayer())self.schedulePlayerBind();},250);if(this.coreTimer.unref)this.coreTimer.unref();};
Adapter.prototype.legacyOn=function(target,event,fn){if(!target||typeof target.on!=='function')return false;try{target.on(event,fn);this.handlers.push({bus:target,event:event,fn:fn});return true;}catch(e){return false;}};
Adapter.prototype.init=function(){if(this.bound)return false;this.bound=true;var L=this.Lampa,self=this;this.bindPlayer();this.schedulePlayerBind();if(L.Listener&&!this.globalBound){this.follow(L.Listener,'full',function(e){self.lastFull=e;});this.follow(L.Listener,'torrent_file',function(e){if(e&&e.element)self.lastTorrent=e.element;});this.globalBound=true;}return true;};
Adapter.prototype.destroy=function(){var self=this;this.handlers.forEach(function(h){self.remove(h);});this.handlers=[];this.unbindVideo();if(this.bindTimer){clearTimeout(this.bindTimer);this.bindTimer=null;}if(this.coreTimer){clearTimeout(this.coreTimer);this.coreTimer=null;}this.bound=false;this.playerBound=false;this.globalBound=false;};
module.exports={Adapter:Adapter};

};
modules["./ui"]=function(module,exports,require){
'use strict';
var content=require('./content-id');
function UI(Lampa, storage, tracker, settings) { this.Lampa=Lampa||{}; this.storage=storage; this.tracker=tracker; this.settings=settings; this.bound=false; this.visible=[]; this.lastError=''; }
UI.prototype.fail=function(e){this.lastError=String(e&&e.message||e||'unknown UI error');if(this.tracker)this.tracker.lastError=this.lastError;};
UI.prototype.seriesId=function(meta){var d=meta&& (meta.movie||meta.card||meta.data||meta);var id=d&&(d.tmdb_id||d.tmdbId||d.id_tmdb||d.id);return id!=null?String(id):null;};
UI.prototype.aggregate=function(meta){var id=this.seriesId(meta), all=this.storage.all(), rows=[], total=0, seasons=meta&&meta.seasons||[];if(!id)return {kind:'unknown',records:0};Object.keys(all).forEach(function(k){var r=all[k];if(r&&r.contentType==='tv'&&String(r.tmdbId||r.stableId)===id)rows.push(r);});rows.sort(function(a,b){return (b.updatedAt||0)-(a.updatedAt||0);});(seasons||[]).forEach(function(s){var n=Number(s.episode_count||s.episodes_count||s.number_of_episodes||0);if(n>0)total+=n;});var done=rows.filter(function(r){return r.completed;}).length, last=rows[0]||null, next=null;
  if(seasons&&seasons.length){var completed={};rows.forEach(function(r){if(r.completed)completed[(r.season||0)+':'+(r.episode||0)]=true;});for(var i=0;i<seasons.length&&!next;i++){var sn=Number(seasons[i].season_number||seasons[i].season||0), count=Number(seasons[i].episode_count||seasons[i].episodes_count||seasons[i].number_of_episodes||0);if(sn<=0)continue;for(var ep=1;ep<=count;ep++)if(!completed[sn+':'+ep]){next={season:sn,episode:ep};break;}}}
  if(!next&&last&&!last.completed)next={season:last.season,episode:last.episode};
  return {kind:'tv',id:id,records:rows.length,last:last,done:done,total:total,next:next};};
UI.prototype.movieSummary=function(meta){var d=meta&& (meta.movie||meta.card||meta.data||meta),id=this.seriesId(d),r=id?this.storage.get('movie:'+id):null;return {kind:'movie',id:id,record:r,records:r?1:0};};
UI.prototype.summary=function(meta){var d=meta&& (meta.movie||meta.card||meta.data||meta),isTv=!!(d&&(d.media_type==='tv'||d.type==='tv'||d.first_air_date||d.number_of_seasons||d.seasons||d.original_name));return isTv?this.aggregate(d):this.movieSummary(d);};
UI.prototype.text=function(s){if(s.kind==='movie'){if(!s.record)return 'История просмотра пока пуста';var r=s.record;return 'Прогресс: '+Math.round(r.percent||0)+'% · '+(r.completed?'Просмотрено':'Не досмотрено')+' · '+this.clock(r.position);}if(s.kind==='tv'){if(!s.records)return 'История просмотра пока пуста';var l=s.last||{},out=['Последняя серия: S'+this.pad(l.season)+'E'+this.pad(l.episode),'Прогресс: '+Math.round(l.percent||0)+'%','Просмотрено серий: '+s.done+(s.total?'/'+s.total:'')];if(s.next)out.push('Следующая: S'+this.pad(s.next.season)+'E'+this.pad(s.next.episode));return out.join('  ·  ');}return 'История просмотра пока пуста';};
UI.prototype.clock=function(v){v=Math.max(0,Math.floor(Number(v)||0));return Math.floor(v/3600)+':'+('0'+Math.floor(v%3600/60)).slice(-2)+':'+('0'+v%60).slice(-2);};
UI.prototype.pad=function(v){return ('0'+(Number(v)||0)).slice(-2);};
UI.prototype.decorateElement=function(el,meta,full){try{if(!el||!this.settings.get('showCards'))return false;var old=el.querySelector&&el.querySelector('.lpm-progress-memory');if(old){if(old.parentNode&&old.parentNode.removeChild)old.parentNode.removeChild(old);else if(typeof old.remove==='function')old.remove();}var box=null;if(full){var buttons=el.querySelector('.full-start-new__buttons'),right=el.querySelector('.full-start-new__right');if(!buttons&&right)buttons=right.querySelector('.full-start-new__title')||right.firstChild;if(!buttons||!el.ownerDocument)return false;box=el.ownerDocument.createElement('div');box.className='lpm-progress-memory';(buttons.parentNode||right).insertBefore(box,buttons);}else{box=el.querySelector&&el.querySelector('.card__view')||el;if(!box||!el.ownerDocument)return false;var n=el.ownerDocument.createElement('div');n.className='lpm-progress-memory';box.appendChild(n);box=n;}var sum=this.summary(meta);box.textContent='Progress Memory · '+this.text(sum);if(box.setAttribute)box.setAttribute('data-kind',sum.kind);if(sum.record&&sum.record.completed&&box.setAttribute)box.setAttribute('data-completed','1');return true;}catch(e){this.fail(e);return false;}};
UI.prototype.decorateFull=function(meta,tries){var self=this;try{if(!this.settings.get('showCards')||typeof document==='undefined'||!document.querySelector)return;var root=document.querySelector('.full-start-new')||document.body;if(!this.decorateElement(root,meta,true)&& (tries||0)<12&&typeof setTimeout==='function')setTimeout(function(){try{self.decorateFull(meta,(tries||0)+1);}catch(e){self.fail(e);}},250);}catch(e){this.fail(e);}};
UI.prototype.decorateCard=function(el){try{var node=el&& (el.get?el.get(0):el[0]||el);if(!node)return;var meta=node.card_data||node.data||{};this.decorateElement(node,meta,false);}catch(e){this.fail(e);}};
UI.prototype.init=function(){if(this.bound)return false;this.bound=true;var L=this.Lampa,self=this;try{var style=document.createElement('style');style.textContent='.lpm-progress-memory{box-sizing:border-box;color:rgba(255,255,255,.82);background:rgba(20,20,20,.72);border-left:.2em solid #ffc107;border-radius:.25em;padding:.35em .6em;margin:.35em 0;font-size:.82em;line-height:1.35;white-space:normal;z-index:4}.lpm-progress-memory[data-completed="1"]{border-left-color:#4caf50}.card__view>.lpm-progress-memory{position:absolute;left:.35em;right:.35em;bottom:.35em;margin:0;font-size:.72em}';if(document.head)document.head.appendChild(style);}catch(e){this.fail(e);}if(L.Listener&&L.Listener.follow){try{L.Listener.follow('full',function(e){try{if(e&&e.type==='complite'&&e.data&&e.data.movie)self.decorateFull(e.data.movie,0);}catch(x){self.fail(x);}});}catch(e){this.fail(e);}}if(L.Maker&&L.Maker.map){try{var map=L.Maker.map('Card'),card=map&&map.Card;if(card&&card.onVisible){var old=card.onVisible;card.onVisible=function(){var result;try{if(typeof old==='function')result=old.apply(this,arguments);}catch(x){self.fail(x);}try{self.decorateCard(this&&this.html);}catch(x2){self.fail(x2);}return result;};}}catch(e){this.fail(e);}}return true;};
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
Settings.prototype.showDiagnostic=function(provider){var L=this.Lampa,d=provider?provider():{};d.version='1.1.3';d.api={storage:!!(L.Storage&&L.Storage.get&&L.Storage.set),listener:!!(L.Listener&&L.Listener.follow),player:!!(L.Player&&L.Player.listener),playerVideo:!!(L.PlayerVideo&&L.PlayerVideo.listener),settings:!!(L.SettingsApi)};var lines=['Версия: '+d.version,'Lampa.Storage: '+(d.api.storage?'подключено':'нет'),'Lampa.Listener: '+(d.api.listener?'подключено':'нет'),'Lampa.Player.listener: '+(d.api.player?'подключено':'нет'),'Lampa.PlayerVideo.listener: '+(d.api.playerVideo?'подключено':'нет'),'TMDB ID: '+(d.tmdbId||'—'),'Сезон/серия: '+(d.season?'S'+('0'+d.season).slice(-2)+'E'+('0'+d.episode).slice(-2):'—'),'Таймкод: '+(d.position||0)+' / '+(d.duration||'—'),'Записей: '+(d.records||0),'Событий: '+(d.events||0),'Последняя ошибка: '+(d.lastError||'нет')];if(L.Modal&&L.Modal.open){try{L.Modal.open({title:'Progress Memory — диагностика',html:'<div class="lpm-diagnostic">'+lines.join('<br>')+'</div>',size:'medium',onBack:function(){L.Modal.close();if(L.Controller&&L.Controller.toggle)L.Controller.toggle('content');}});return true;}catch(e){}}if(L.Noty&&L.Noty.show)L.Noty.show(lines.join(' | '));return false;};
Settings.prototype.init=function(provider,onChange){var L=this.Lampa;if(!L.SettingsApi||!L.SettingsApi.addComponent)return false;try{var self=this;L.SettingsApi.addComponent({component:'progress_memory',name:'Progress Memory',icon:''});var add=function(name,type,values,field){L.SettingsApi.addParam({component:'progress_memory',param:{name:name,type:type,values:values,default:self.get(name)},field:{name:field},onChange:function(v){var value=type==='select'?Number(v):v;self.set(name,value);if(onChange)onChange(name,value);}});};add('enabled','trigger',undefined,'Включить Progress Memory');add('threshold','select',{75:'75%',80:'80%',85:'85%',90:'90%',95:'95%',99:'99%'},'Порог завершения');add('seekProtection','trigger',undefined,'Защита от случайной перемотки');add('interval','select',{10:'10 секунд',15:'15 секунд',30:'30 секунд'},'Интервал сохранения');add('showCards','trigger',undefined,'Показывать прогресс в карточках');add('showSeasons','trigger',undefined,'Показывать статистику сезонов');L.SettingsApi.addParam({component:'progress_memory',param:{name:'progress_memory_diagnostic',type:'trigger',default:false},field:{name:'Открыть диагностику'},onChange:function(){self.showDiagnostic(provider);}});return true;}catch(e){return false;}};
module.exports={Settings:Settings,DEFAULTS:DEFAULTS};

};
modules["./plugin"]=function(module,exports,require){
'use strict';
var Storage=require('./storage').Storage, Tracker=require('./tracker').Tracker, Adapter=require('./lampa-adapter').Adapter, UI=require('./ui').UI, Settings=require('./settings').Settings;
var api={version:'1.1.3',storage:null,tracker:null,settings:null,adapter:null,ui:null,initialized:false};
api.init=function(root){if(api.initialized)return api;root=root||((typeof window!=='undefined')?window:{});var L=root.Lampa||{};api.settings=new Settings(L);api.storage=new Storage({lampa:L});api.tracker=new Tracker(api.storage,{threshold:api.settings.get('threshold'),interval:api.settings.get('interval'),seekProtection:api.settings.get('seekProtection')});api.adapter=new Adapter(L,api.tracker);if(api.settings.get('enabled'))api.adapter.init();api.ui=new UI(L,api.storage,api.tracker,api.settings);if(api.settings.get('enabled'))api.ui.init();api.settings.init(function(){return api.diagnostics();},function(name,value){if(name==='threshold'||name==='interval'||name==='seekProtection'){var o={};o[name]=value;api.tracker.configure(o);}});api.initialized=true;return api;};
api.identify=require('./content-id').identify;
api.get=function(key){return api.storage&&api.storage.get(key);};
api.export=function(){return api.storage.export();};
api.import=function(v,merge){return api.storage.import(v,merge!==false);};
api.clear=function(){return api.storage.clear();};
api.mark=function(meta,done){return api.tracker.mark(meta,done);};
api.setProgress=function(meta,percent,duration){return api.tracker.setProgress(meta,percent,duration);};
api.remove=function(meta){var id=require('./content-id').identify(meta);if(id.valid&&api.storage){api.storage.remove(id.key);return true;}return false;};
api.diagnostics=function(){var d=api.tracker?api.tracker.diagnostics():{};d.version=api.version;d.api={storage:!!(api.storage),listener:!!(api.adapter&&api.adapter.Lampa.Listener),player:!!(api.adapter&&api.adapter.Lampa.Player&&api.adapter.Lampa.Player.listener),playerVideo:!!(api.adapter&&api.adapter.Lampa.PlayerVideo&&api.adapter.Lampa.PlayerVideo.listener),settings:!!(api.settings&&api.settings.Lampa.SettingsApi)};d.adapter={playerBound:!!(api.adapter&&api.adapter.playerBound),videoHandlers:api.adapter&&api.adapter.videoHandlers?api.adapter.videoHandlers.length:0,playerAttempts:api.adapter&&api.adapter.coreAttempts||0};return d;};
api.openDiagnostics=function(){return api.settings&&api.settings.showDiagnostic(function(){return api.diagnostics();});};
module.exports=api;

};
var cache={};function require(name){if(cache[name])return cache[name].exports;var m={exports:{}};if(!modules[name])throw new Error('Missing module '+name);modules[name](m,m.exports,require);cache[name]=m;return m.exports;}
var api=require('./plugin');root.LampaProgressMemory=api;try{api.init();}catch(error){api.initError=String(error&&error.message||error);root.LampaProgressMemoryError=api.initError;}
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
