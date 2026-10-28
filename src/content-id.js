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
