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

const DB = require("../Web/db");
const len = Number(process.argv[2] || 10);

DB.ready = function(){
	var rank = 0;
	var phit = 0;
	
	DB.kkutu['ko'].find([ 'hit', { $gt: 0 } ]).sort([ 'hit', -1 ]).limit(len).on(function($res){
		var i, $o, c;
		var res = [];
		
		for(i in $res){
			$o = $res[i];
			if(phit == $o.hit){
				c = rank;
			}else{
				c = rank = Number(i) + 1;
				phit = $o.hit;
			}
			res.push(c + "위. " + $o._id + " (" + $o.hit + ")");
		}
		console.log(res.join('\n'));
		process.exit();
	});
};