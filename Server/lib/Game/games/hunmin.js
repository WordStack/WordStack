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

// ㄱ, ㄴ, ㄷ, ㅁ, ㅂ, ㅅ, ㅇ, ㅈ, ㅊ, ㅌ, ㅍ, ㅎ
const HUNMIN_LIST = [ 4352, 4354, 4355, 4358, 4359, 4361, 4363, 4364, 4366, 4368, 4369, 4370 ];

exports.getTitle = function(){
	var R = new Lizard.Tail();
	var my = this;
	
	my.game.done = [];
	setTimeout(function(){
		R.go("①②③④⑤⑥⑦⑧⑨⑩");
	}, 500);
	return R;
};
exports.roundReady = function(){
	var my = this;
	
	clearTimeout(my.game.turnTimer);
	my.game.round++;
	my.game.roundTime = my.time * 1000;
	if(my.game.round <= my.round){
		my.game.theme = getTheme(2, my.game.done);
		my.game.chain = [];
		if(my.opts.mission) my.game.mission = getMission(my.game.theme);
		my.game.done.push(my.game.theme);
		my.byMaster('roundReady', {
			round: my.game.round,
			theme: my.game.theme,
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
	my.byMaster('turnStart', {
		turn: my.game.turn,
		speed: speed,
		roundTime: my.game.roundTime,
		turnTime: my.game.turnTime,
		mission: my.game.mission,
		seq: force ? my.game.seq : undefined
	}, true);
	my.game.turnTimer = setTimeout(my.turnEnd, Math.min(my.game.roundTime, my.game.turnTime + 100));
	if(si = my.game.seq[my.game.turn]) if(si.robot){
		my.readyRobot(si);
	}
};
exports.turnEnd = function(){
	var my = this;
	var target = COMMON.DIC[my.game.seq[my.game.turn]] || my.game.seq[my.game.turn];
	var score;
	
	if(my.game.loading){
		my.game.turnTimer = setTimeout(my.turnEnd, 100);
		return;
	}
	if(!my.game.theme) return;
	
	my.game.late = true;
	if(target) if(target.game){
		score = Const.getPenalty(my.game.chain, target.game.score);
		target.game.score += score;
	}
	COMMON.getAuto.call(my, my.game.theme, 0).then(function(w){
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
exports.submit = function(client, text, data){
	var score, l = 'ko', t;
	var my = this;
	var tv = (new Date()).getTime();
	var mgt = my.game.seq[my.game.turn];
	
	if(!mgt) return;
	if(!mgt.robot) if(mgt != client.id) return;
	if(!my.game.theme) return;
	if(isChainable(text, my.game.theme)){
		if(my.game.chain.indexOf(text) == -1){
			my.game.loading = true;
			function onDB($doc){
				function preApproved(){
					if(my.game.late) return;
					if(!my.game.chain) return;
					
					my.game.loading = false;
					my.game.late = true;
					clearTimeout(my.game.turnTimer);
					t = tv - my.game.turnAt;
					score = my.getScore(text, t);
					my.game.chain.push(text);
					my.game.roundTime -= t;
					client.game.score += score;
					client.publish('turnEnd', {
						ok: true,
						value: text,
						mean: $doc.mean,
						theme: $doc.theme,
						wc: $doc.type,
						score: score,
						bonus: (my.game.mission === true) ? score - my.getScore(text, t, true) : 0
					}, true);
					if(my.game.mission === true){
						my.game.mission = getMission(my.game.theme);
					}
					setTimeout(my.turnNext, my.game.turnTime / 6);
					if(!client.robot){
						client.invokeWordPiece(text, 1);
					}
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
			COMMON.DB.kkutu[l].findOne([ '_id', text ], [ 'type', Const.KOR_GROUP ]).on(onDB);
		}else{
			client.publish('turnError', { code: 409, value: text }, true);
		}
	}else{
		client.chat(text);
	}
};
exports.getScore = function(text, delay, ignoreMission){
	var my = this;
	var tr = 1 - delay / my.game.turnTime;
	var score = Const.getPreScore(text, my.game.chain, tr);
	var arr;
	
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
	var w, text;
	
	COMMON.getAuto.call(my, my.game.theme, 2).then(function(list){
		if(list.length){
			list.sort(function(a, b){ return b.hit - a.hit; });
			if(COMMON.ROBOT_HIT_LIMIT[level] > list[0].hit) denied();
			else pickList(list);
		}else denied();
	});
	function denied(){
		text = `${my.game.theme}... T.T`;
		after();
	}
	function pickList(list){
		if(list) do{
			if(!(w = list.shift())) break;
		}while(false);
		if(w){
			text = w._id;
			delay += 500 * COMMON.ROBOT_THINK_COEF[level] * Math.random() / Math.log(1.1 + w.hit);
			after();
		}else denied();
	}
	function after(){
		delay += text.length * COMMON.ROBOT_TYPE_COEF[level];
		setTimeout(my.turnRobot, delay, robot, text);
	}
};
function isChainable(text, theme){
	return COMMON.hunminRegex(theme).exec(text) != null;
}
function getMission(theme){
	var flag;
	
	if(!theme) return;
	if(Math.random() < 0.5) flag = 0;
	else flag = 1;
	
	return String.fromCharCode(44032 + 588 * (theme.charCodeAt(flag) - 4352));
}
function getTheme(len, ex){
	var res = "";
	var c, d;
	
	while(len > 0){
		c = String.fromCharCode(HUNMIN_LIST[Math.floor(Math.random() * HUNMIN_LIST.length)]);
		if(ex.includes(d = res + c)) continue;
		res = d;
		len--;
	}
	return res;
}