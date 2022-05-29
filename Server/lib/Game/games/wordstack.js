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

var Const = require('../../const');
var Lizard = require('../../sub/lizard');
var DB;
var DIC;

const ROBOT_START_DELAY = [ 1200, 800, 400, 200, 0 ];
const ROBOT_TYPE_COEF = [ 1250, 750, 500, 250, 0 ];
const ROBOT_THINK_COEF = [ 4, 2, 1, 0, 0 ];
const ROBOT_HIT_LIMIT = [ 8, 4, 2, 1, 0 ];
const ROBOT_LENGTH_LIMIT = [ 3, 4, 9, 99, 99 ];
const RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
const RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
const NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];

function traverse(func){
    var my = this;
    var i, o;
    
    for(i in my.game.seq){
        if(!(o = DIC[my.game.seq[i]])) continue;
        if(!o.game) continue;
        func(o);
    }
}

exports.init = function(_DB, _DIC){
    DB = _DB;
    DIC = _DIC;
};

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

    DB.kkutu[my.rule.lang].find([ '_id', /^.{3}$/ ]).limit(416).on(function($res){
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
        pool: my.game.pool
    }, true);
    setTimeout(my.turnStart, 2400);
};

exports.turnStart = function(){
    var my = this;

    my.game.late = false;
    my.game.qTimer = setTimeout(my.turnEnd, my.game.roundTime);
    my.byMaster('turnStart', { roundTime: my.game.roundTime }, true);
};

exports.turnEnd = function(){
    var my = this;
    
};

exports.submit = function(client, text, data){
    var my = this;
    
};

exports.getScore = function(text, delay){
    var my = this;
    
    

    return 0;
};