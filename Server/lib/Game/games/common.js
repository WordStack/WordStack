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
const RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
const RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
const NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];

exports.init = function(_DB, _DIC){
    DB = _DB;
    DIC = _DIC;
};

function keyByOptions(opts){
    var arr = [];
    
    if(opts.injeong) arr.push('X');
    if(opts.loanword) arr.push('L');
    if(opts.strict) arr.push('S');
    return arr.join('');
}
exports.shuffle = function(arr){
    var i, r = [];
    
    for(i in arr) r.push(arr[i]);
    r.sort(function(a, b){ return Math.random() - 0.5; });
    
    return r;
}
exports.getChar = function(text){
    var my = this;
    
    switch(Const.GAME_TYPE[my.mode]){
        case 'EKT': return text.slice(text.length - 3);
        case 'KAP': return text.charAt(0);
        default: return text.slice(-1);
    }
};
exports.getSubChar = function(char){
    var my = this;
    var r;
    var c = char.charCodeAt();
    var k;
    var ca, cb, cc;
    
    switch(Const.GAME_TYPE[my.mode]){
        case "EKT":
            if(char.length > 2) r = char.slice(1);
            break;
        case "KKT": case "KSH": case "KAP": case "KWS":
            k = c - 0xAC00;
            if(k < 0 || k > 11171) break;
            ca = [ Math.floor(k/28/21), Math.floor(k/28)%21, k%28 ];
            cb = [ ca[0] + 0x1100, ca[1] + 0x1161, ca[2] + 0x11A7 ];
            cc = false;
            if(cb[0] == 4357){ // ㄹ에서 ㄴ, ㅇ
                cc = true;
                if(RIEUL_TO_NIEUN.includes(cb[1])) cb[0] = 4354;
                else if(RIEUL_TO_IEUNG.includes(cb[1])) cb[0] = 4363;
                else cc = false;
            }else if(cb[0] == 4354){ // ㄴ에서 ㅇ
                if(NIEUN_TO_IEUNG.indexOf(cb[1]) != -1){
                    cb[0] = 4363;
                    cc = true;
                }
            }
            if(cc){
                cb[0] -= 0x1100; cb[1] -= 0x1161; cb[2] -= 0x11A7;
                r = String.fromCharCode(((cb[0] * 21) + cb[1]) * 28 + cb[2] + 0xAC00);
            }
            break;
        default:
            break;
    }
    return r;
}

exports.traverse = function(func){
    var my = this;
    var i, o;
    
    for(i in my.game.seq){
        if(!(o = DIC[my.game.seq[i]])) continue;
        if(!o.game) continue;
        func(o);
    }
}

exports.getAuto = function(char, subc, type){ // TODO : 모든 게임모드의 getAuto 함수 통일
    /* type
        0 무작위 단어 하나
        1 존재 여부
        2 단어 목록
    */
    var my = this;
    var R = new Lizard.Tail();
    var gameType = Const.GAME_TYPE[my.mode];
    var adv, adc;
    var key = gameType + "_" + keyByOptions(my.opts);
    var MAN = DB.kkutu_manner[my.rule.lang];
    var bool = type == 1;
    
    adc = char + (subc ? ("|"+subc) : "");
    switch(gameType){
        case 'EKT':
            adv = `^(${adc})..`;
            break;
        case 'KSH': case 'KWS':
            adv = `^(${adc}).`;
            break;
        case 'ESH': case 'EWS':
            adv = `^(${adc})...`;
            break;
        case 'KKT':
            adv = `^(${adc}).{${my.game.wordLength-1}}$`;
            break;
        case 'KAP':
            adv = `.(${adc})$`;
            break;
    }
    if(!char){
        console.log(`Undefined char detected! key=${key} type=${type} adc=${adc}`);
    }
    MAN.findOne([ '_id', char || "¡Ú" ]).on(function($mn){
        if($mn && bool){
            if($mn[key] === null) produce();
            else R.go($mn[key]);
        }else{
            produce();
        }
    });
    function produce(){
        var aqs = [[ '_id', new RegExp(adv) ]];
        var aft;
        var lst;
        
        if(!my.opts.injeong) aqs.push([ 'flag', { '$nand': Const.KOR_FLAG.INJEONG } ]);
        if(my.rule.lang == "ko"){
            if(my.opts.loanword) aqs.push([ 'flag', { '$nand': Const.KOR_FLAG.LOANWORD } ]);
            if(my.opts.strict) aqs.push([ 'type', Const.KOR_STRICT ], [ 'flag', { $lte: 3 } ]);
            else aqs.push([ 'type', Const.KOR_GROUP ]);
        }else{
            aqs.push([ '_id', Const.ENG_ID ]);
        }
        switch(type){
            case 0:
            default:
                aft = function($md){
                    R.go($md[Math.floor(Math.random() * $md.length)]);
                };
                break;
            case 1:
                aft = function($md){
                    R.go($md.length ? true : false);
                };
                break;
            case 2:
                aft = function($md){
                    R.go($md);
                };
                break;
        }
        DB.kkutu[my.rule.lang].find.apply(this, aqs).limit(bool ? 1 : 123).on(function($md){
            forManner($md);
            if(my.game.chain) aft($md.filter(function(item){ return !my.game.chain.includes(item); }));
            else aft($md);
        });
        function forManner(list){
            lst = list;
            MAN.upsert([ '_id', char ]).set([ key, lst.length ? true : false ]).on(null, null, onFail);
        }
        function onFail(){
            MAN.createColumn(key, "boolean").on(function(){
                forManner(lst);
            });
        }
    }
    return R;
}