'use strict';
var DEFAULTS={enabled:true,threshold:90,seekProtection:true,interval:15,showCards:true,showSeasons:true,diagnostic:false};
function Settings(Lampa){this.Lampa=Lampa||{};this.key='lampa_progress_memory_settings';this.values={};this.load();}
Settings.prototype.load=function(){var raw=null;try{if(this.Lampa.Storage&&this.Lampa.Storage.get)raw=this.Lampa.Storage.get(this.key);}catch(e){}if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){raw=null;}}this.values={};Object.keys(DEFAULTS).forEach(function(k){this.values[k]=raw&&raw[k]!==undefined?raw[k]:DEFAULTS[k];},this);};
Settings.prototype.get=function(k){return this.values[k];};
Settings.prototype.set=function(k,v){if(!(k in DEFAULTS))return;this.values[k]=v;try{if(this.Lampa.Storage&&this.Lampa.Storage.set)this.Lampa.Storage.set(this.key,JSON.stringify(this.values));}catch(e){}};
Settings.prototype.all=function(){var o={};Object.keys(this.values).forEach(function(k){o[k]=this.values[k];});return o;};
Settings.prototype.init=function(){var L=this.Lampa;if(!L.SettingsApi||!L.SettingsApi.addComponent)return false;try{var self=this;L.SettingsApi.addComponent({component:'progress_memory',name:'Progress Memory',settings:[{name:'threshold',type:'select',values:{75:'75%',80:'80%',85:'85%',90:'90%',95:'95%',99:'99%'},default:this.get('threshold'),onChange:function(v){self.set('threshold',Number(v));}},{name:'interval',type:'select',values:{10:'10 сек',15:'15 сек',30:'30 сек'},default:this.get('interval'),onChange:function(v){self.set('interval',Number(v));}}]});return true;}catch(e){return false;}};
module.exports={Settings:Settings,DEFAULTS:DEFAULTS};
