/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Const = require('../../const');
const Lizard = require('../../sub/lizard');
const COMMON = require('./common');

exports.getTitle = function(){
	var R = new Lizard.Tail();
	var my = this;
	var l = my.rule;
	var EXAMPLE;
	var eng, ja;
	
	if(!l){
		R.go("undefinedd");
		return R;
	}
	if(!l.lang){
		R.go("undefinedd");
		return R;
	}
	EXAMPLE = Const.EXAMPLE_TITLE[l.lang];
	my.game.dic = {};
	
	switch(Const.GAME_TYPE[my.mode]){
		case 'EKT':
		case 'ESH':
			eng = "^" + String.fromCharCode(97 + Math.floor(Math.random() * 26));
			break;
		case 'KKT':
			my.game.wordLength = 3;
		case 'KSH':
			ja = 44032 + 588 * Math.floor(Math.random() * 18);
			eng = "^[\\u" + ja.toString(16) + "-\\u" + (ja + 587).toString(16) + "]";
			break;
		case 'KAP':
			ja = 44032 + 588 * Math.floor(Math.random() * 18);
			eng = "[\\u" + ja.toString(16) + "-\\u" + (ja + 587).toString(16) + "]$";
			break;
	}
	function tryTitle(h){
		if(h > 50){
			R.go(EXAMPLE);
			return;
		}
		COMMON.DB.kkutu[l.lang].find(
			[ '_id', new RegExp(eng + ".{" + Math.max(1, my.round - 1) + "}$") ],
			// [ 'hit', { '$lte': h } ],
			(l.lang == "ko") ? [ 'type', Const.KOR_GROUP ] : [ '_id', Const.ENG_ID ]
			// '$where', eng+"this._id.length == " + Math.max(2, my.round) + " && this.hit <= " + h
		).limit(20).on(function($md){
			var list;
			
			if($md.length){
				list = COMMON.shuffle($md);
				checkTitle(list.shift()._id).then(onChecked);
			
				function onChecked(v){
					if(v) R.go(v);
					else if(list.length) checkTitle(list.shift()._id).then(onChecked);
					else R.go(EXAMPLE);
				}
			}else{
				tryTitle(h + 10);
			}
		});
	}
	function checkTitle(title){
		var R = new Lizard.Tail();
		var i, list = [];
		var len;
		
		/* ºÎÇÏ°¡ ³Ê¹« °É¸°´Ù¸é ÁÖ¼®À» Ç®ÀÚ.
		R.go(true);
		return R;
		*/
		if(title == null){
			R.go(EXAMPLE);
		}else{
			len = title.length;
			for(i=0; i<len; i++) list.push(COMMON.getAuto.call(my, title[i], COMMON.getSubChar.call(my, title[i]), 1));
			
			Lizard.all(list).then(function(res){
				for(i in res) if(!res[i]) return R.go(EXAMPLE);
				
				return R.go(title);
			});
		}
		return R;
	}
	tryTitle(10);
	
	return R;
};
exports.roundReady = function(){
	var my = this;
	if(!my.game.title) return;
	
	clearTimeout(my.game.turnTimer);
	my.game.round++;
	my.game.roundTime = my.time * 1000;
	if(my.game.round <= my.round){
		my.game.char = my.game.title[my.game.round - 1];
		my.game.subChar = COMMON.getSubChar.call(my, my.game.char);
		my.game.chain = [];
		if(my.opts.mission) my.game.mission = getMission(my.rule.lang);
		if(my.opts.sami) my.game.wordLength = 2;
		
		my.byMaster('roundReady', {
			round: my.game.round,
			char: my.game.char,
			subChar: my.game.subChar,
			mission: my.game.mission
		}, true);
		my.game.turnTimer = setTimeout(my.turnStart, 2400);
	}else{
		my.roundEnd();
	}
};
exports.turnStart = function(force){
	var my = this;
	var speed;
	var si;
	
	if(!my.game.chain) return;
	my.game.roundTime = Math.min(my.game.roundTime, Math.max(10000, 150000 - my.game.chain.length * 1500));
	speed = my.getTurnSpeed(my.game.roundTime);
	clearTimeout(my.game.turnTimer);
	clearTimeout(my.game.robotTimer);
	my.game.late = false;
	my.game.turnTime = 15000 - 1400 * speed;
	my.game.turnAt = (new Date()).getTime();
	if(my.opts.sami) my.game.wordLength = (my.game.wordLength == 3) ? 2 : 3;
	
	my.byMaster('turnStart', {
		turn: my.game.turn,
		char: my.game.char,
		subChar: my.game.subChar,
		speed: speed,
		roundTime: my.game.roundTime,
		turnTime: my.game.turnTime,
		mission: my.game.mission,
		wordLength: my.game.wordLength,
		seq: force ? my.game.seq : undefined
	}, true);
	my.game.turnTimer = setTimeout(my.turnEnd, Math.min(my.game.roundTime, my.game.turnTime + 100));
	if(si = my.game.seq[my.game.turn]) if(si.robot){
		si._done = [];
		my.readyRobot(si);
	}
};
exports.turnEnd = function(){
	var my = this;
	var target;
	var score;
	
	if(!my.game.seq) return;
	target = COMMON.DIC[my.game.seq[my.game.turn]] || my.game.seq[my.game.turn];
	
	if(my.game.loading){
		my.game.turnTimer = setTimeout(my.turnEnd, 100);
		return;
	}
	my.game.late = true;
	if(target) if(target.game){
		score = Const.getPenalty(my.game.chain, target.game.score);
		target.game.score += score;
	}
	COMMON.getAuto.call(my, my.game.char, my.game.subChar, 0).then(function(w){
		my.byMaster('turnEnd', {
			ok: false,
			target: target ? target.id : null,
			score: score,
			hint: w
		}, true);
		my.game._rrt = setTimeout(my.roundReady, 3000);
	});
	clearTimeout(my.game.robotTimer);
};
exports.submit = function(client, text){
	var score, l, t;
	var my = this;
	var tv = (new Date()).getTime();
	var mgt = my.game.seq[my.game.turn];
	
	if(!mgt) return;
	if(!mgt.robot) if(mgt != client.id) return;
	if(!my.game.char) return;
	
	if(!isChainable(text, my.mode, my.game.char, my.game.subChar)) return client.chat(text);
	if(my.game.chain.indexOf(text) != -1) return client.publish('turnError', { code: 409, value: text }, true);
	
	l = my.rule.lang;
	my.game.loading = true;
	function onDB($doc){
		if(!my.game.chain) return;
		var preChar = COMMON.getChar.call(my, text);
		var preSubChar = COMMON.getSubChar.call(my, preChar);
		var firstMove = my.game.chain.length < 1;
		
		function preApproved(){
			function approved(){
				if(my.game.late) return;
				if(!my.game.chain) return;
				if(!my.game.dic) return;
				
				my.game.loading = false;
				my.game.late = true;
				clearTimeout(my.game.turnTimer);
				t = tv - my.game.turnAt;
				score = my.getScore(text, t);
				my.game.dic[text] = (my.game.dic[text] || 0) + 1;
				my.game.chain.push(text);
				my.game.roundTime -= t;
				my.game.char = preChar;
				my.game.subChar = preSubChar;
				client.game.score += score;
				client.publish('turnEnd', {
					ok: true,
					value: text,
					mean: $doc.mean,
					theme: $doc.theme,
					wc: $doc.type,
					score: score,
					bonus: (my.game.mission === true) ? score - my.getScore(text, t, true) : 0,
					baby: $doc.baby
				}, true);
				if(my.game.mission === true){
					my.game.mission = getMission(my.rule.lang);
				}
				setTimeout(my.turnNext, my.game.turnTime / 6);
				if(!client.robot){
					client.invokeWordPiece(text, 1);
					COMMON.DB.kkutu[l].update([ '_id', text ]).set([ 'hit', $doc.hit + 1 ]).on();
				}
			}
			if(firstMove || my.opts.manner) COMMON.getAuto.call(my, preChar, preSubChar, 1).then(function(w){
				if(w) approved();
				else{
					my.game.loading = false;
					client.publish('turnError', { code: firstMove ? 402 : 403, value: text }, true);
					if(client.robot){
						my.readyRobot(client);
					}
				}
			});
			else approved();
		}
		function denied(code){
			my.game.loading = false;
			client.publish('turnError', { code: code || 404, value: text }, true);
		}
		if($doc){
			if(!my.opts.injeong && ($doc.flag & Const.KOR_FLAG.INJEONG)) denied();
			else if(my.opts.strict && (!$doc.type.match(Const.KOR_STRICT) || $doc.flag >= 4)) denied(406);
			else if(my.opts.loanword && ($doc.flag & Const.KOR_FLAG.LOANWORD)) denied(405);
			else preApproved();
		}else{
			denied();
		}
	}
	function isChainable(){
		var type = Const.GAME_TYPE[my.mode];
		var char = my.game.char, subChar = my.game.subChar;
		var l = char.length;
		
		if(!text) return false;
		if(text.length <= l) return false;
		if(my.game.wordLength && text.length != my.game.wordLength) return false;
		if(type == "KAP") return (text.slice(-1) == char) || (text.slice(-1) == subChar);
		switch(l){
			case 1: return (text[0] == char) || (text[0] == subChar);
			case 2: return (text.substr(0, 2) == char);
			case 3: return (text.substr(0, 3) == char) || (text.substr(0, 2) == char.slice(1));
			default: return false;
		}
	}
	COMMON.DB.kkutu[l].findOne([ '_id', text ],
		(l == "ko") ? [ 'type', Const.KOR_GROUP ] : [ '_id', Const.ENG_ID ]
	).on(onDB);
};
exports.getScore = function(text, delay, ignoreMission){
	var my = this;
	var tr = 1 - delay / my.game.turnTime;
	var score, arr;
	
	if(!text || !my.game.chain || !my.game.dic) return 0;
	score = Const.getPreScore(text, my.game.chain, tr);
	
	if(my.game.dic[text]) score *= 15 / (my.game.dic[text] + 15);
	if(!ignoreMission) if(arr = text.match(new RegExp(my.game.mission, "g"))){
		score += score * 0.5 * arr.length;
		my.game.mission = true;
	}
	return Math.round(score);
};
exports.readyRobot = function(robot){
	var my = this;
	var level = robot.level;
	var delay = COMMON.ROBOT_START_DELAY[level];
	var ended = {};
	var w, text, i;
	var lmax;
	var isRev = Const.GAME_TYPE[my.mode] == "KAP";
	
	COMMON.getAuto.call(my, my.game.char, my.game.subChar, 2).then(function(list){
		if(list.length){
			list.sort(function(a, b){ return b.hit - a.hit; });
			if(COMMON.ROBOT_HIT_LIMIT[level] > list[0].hit) denied();
			else{
				if(level >= 3 && !robot._done.length){
					if(Math.random() < 0.5) list.sort(function(a, b){ return b._id.length - a._id.length; });
					if(list[0]._id.length < 8 && my.game.turnTime >= 2300){
						for(i in list){
							w = list[i]._id.charAt(isRev ? 0 : (list[i]._id.length - 1));
							if(!ended.hasOwnProperty(w)) ended[w] = [];
							ended[w].push(list[i]);
						}
						getWishList(Object.keys(ended)).then(function(key){
							var v = ended[key];
							
							if(!v) denied();
							else pickList(v);
						});
					}else{
						pickList(list);
					}
				}else pickList(list);
			}
		}else denied();
	});
	function denied(){
		text = isRev ? `T.T ...${my.game.char}` : `${my.game.char}... T.T`;
		after();
	}
	function pickList(list){
		if(list) do{
			if(!(w = list.shift())) break;
		}while(w._id.length > COMMON.ROBOT_LENGTH_LIMIT[level] || robot._done.includes(w._id));
		if(w){
			text = w._id;
			delay += 500 * COMMON.ROBOT_THINK_COEF[level] * Math.random() / Math.log(1.1 + w.hit);
			after();
		}else denied();
	}
	function after(){
		delay += text.length * COMMON.ROBOT_TYPE_COEF[level];
		robot._done.push(text);
		setTimeout(my.turnRobot, delay, robot, text);
	}
	function getWishList(list){
		var R = new Lizard.Tail();
		var wz = [];
		var res;
		
		for(i in list) wz.push(getWish(list[i]));
		Lizard.all(wz).then(function($res){
			if(!my.game.chain) return;
			$res.sort(function(a, b){ return a.length - b.length; });
			
			if(my.opts.manner || !my.game.chain.length){
				while(res = $res.shift()) if(res.length) break;
			}else res = $res.shift();
			R.go(res ? res.char : null);
		});
		return R;
	}
	function getWish(char){
		var R = new Lizard.Tail();
		
		COMMON.DB.kkutu[my.rule.lang].find([ '_id', new RegExp(isRev ? `.${char}$` : `^${char}.`) ]).limit(10).on(function($res){
			R.go({ char: char, length: $res.length });
		});
		return R;
	}
};
function getMission(l){
	var arr = (l == "ko") ? Const.MISSION_ko : Const.MISSION_en;
	
	if(!arr) return "-";
	return arr[Math.floor(Math.random() * arr.length)];
}