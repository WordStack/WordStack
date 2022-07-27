/**
 * WordStack Project
 * Copyright (C) 2022 Koko Ayame(preta@siro.dev)
 * 
 * Based on KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const Const = require('../../const');
const Lizard = require('../../sub/lizard');
const COMMON = require('./common');

const ROBOT_START_DELAY = [ 1200, 800, 400, 200, 0 ];
const ROBOT_TYPE_COEF = [ 1250, 750, 500, 250, 0 ];
const ROBOT_THINK_COEF = [ 4, 2, 1, 0, 0 ];
const ROBOT_HIT_LIMIT = [ 8, 4, 2, 1, 0 ];
const ROBOT_LENGTH_LIMIT = [ 3, 4, 9, 99, 99 ];


exports.getTitle = function(){
    var R = new Lizard.Tail();
    var my = this;
    var l = my.rule;
    my.game.chain = {};
    my.game.pool = {};

    if(!l){
        R.go("undefinedd");
        return R;
    }

    COMMON.DB.kkutu[my.rule.lang].find([ '_id', /^.{3}$/ ]).limit(416).on(function($res){
        pick($res.map(function(item){ return item._id; }));
    });

    function pick(list){
        my.game.charpool = [];
        var len = my.game.seq.length * 3;
        
        for(j=0; j<len; j++){
            my.game.charpool = my.game.charpool.concat(list[Math.floor(Math.random() * list.length)].split(""));
        }
        console.log(my.game.charpool)
    }
    
    setTimeout(function(){
        R.go("①②③④⑤⑥⑦⑧⑨⑩");
    }, 500);
    return R;
};

exports.roundReady = function(){
    var my = this;
    
    my.game.round++;
    my.game.roundTime = my.time * 1000;
    if(my.game.round <= my.round){
        for(k in my.game.seq){
            o = my.game.seq[k]
            t = o.robot ? k : o
            my.game.chain[t] = [];
            my.game.pool[t] = [];
            for(i=0;i<5;i++) {
                my.game.pool[t].push(my.game.charpool[Math.floor(Math.random() * my.game.charpool.length)])
            }
        }
        my.byMaster('roundReady', {
            round: my.game.round,
            pool: my.game.pool // TODO: 클라이언트에서는 자신의 풀 데이터만 볼 수 있도록
        }, true);
        setTimeout(my.turnStart, 2400);
    }else{
        my.roundEnd();
    }
};

exports.turnStart = function(){
    var my = this;

    my.game.late = false;
    my.game.qTimer = setTimeout(my.turnEnd, my.game.roundTime);
    my.byMaster('turnStart', { roundTime: my.game.roundTime }, true);
};

exports.turnEnd = function(){
    var my = this;
    var score;
    
    if(!my.game.seq) return;
    
    if(my.game.loading){
        my.game.turnTimer = setTimeout(my.turnEnd, 100);
        return;
    }
    my.game.late = true;
    my.byMaster('turnEnd', {
        ok: false
    }, true);
    my.game._rrt = setTimeout(my.roundReady, 3000);
    clearTimeout(my.game.robotTimer);
};

exports.submit = function(client, text){
    var score, l, t;
    var my = this;
    var tv = (new Date()).getTime();
    
    if(!my.game.pool) return;
    
    if(!isChainable(text, my.mode, my.game.pool[client.id])) return client.chat(text);
    if(my.game.chain[client.id].indexOf(text) != -1) return client.publish('turnError', { code: 409, value: text }, true);
    
    l = my.rule.lang;
    my.game.loading = true;
    function onDB($doc){
        if(!my.game.chain[client.id]) return;
        var preChar = COMMON.getChar.call(my, text);
        var preSubChar = COMMON.getSubChar.call(my, preChar);
        var firstMove = my.game.chain[client.id].length < 1;
        
        function preApproved(){
            function approved(){
                if(my.game.late) return;
                if(!my.game.chain[client.id]) return;
                if(!my.game.dic) return;
                
                my.game.loading = false;
                my.game.late = true;
                clearTimeout(my.game.turnTimer);
                t = tv - my.game.turnAt;
                score = my.getScore(text, t);
                my.game.dic[text] = (my.game.dic[text] || 0) + 1;
                my.game.chain[client.id].push(text);
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
        var pool = my.game.pool[client.id];
        var char = [];
        for (var c of pool) {
            char.push(c);
            var sub = COMMON.getSubChar.call(my, c);
            if (sub) char.push(sub);
        }
        console.debug(char);
        if(!text) return false;
        if(text.length <= 1) return false;
        return char.indexOf(text[0]) != -1;
    }
    COMMON.DB.kkutu[l].findOne([ '_id', text ],
        (l == "ko") ? [ 'type', Const.KOR_GROUP ] : [ '_id', Const.ENG_ID ]
    ).on(onDB);
};

exports.getScore = function(text, delay){
    var my = this;
    
    

    return 0;
};