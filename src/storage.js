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
