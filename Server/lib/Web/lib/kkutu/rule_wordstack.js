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

$lib.Wordstack.roundReady = function(data){
	var i, len = $data.room.game.title.length;
	var $l;
	
	$data._chatter = mobile ? $stage.game.hereText : $stage.talk;
	clearBoard();
	$data._roundTime = $data.room.time * 1000;
	$data._pool = data.pool[$data.id] ? data.pool[$data.id] : []
	$stage.game.display.html($data._pool.join(" ")); // TODO: 클라이언트에서는 자신의 풀 데이터만 볼 수 있도록
	$stage.game.chain.show().html($data._pool.length);
	// if($data.room.opts.mission){
	// 	$stage.game.items.show().css('opacity', 1).html($data.mission = data.mission);
	// }
	drawRound(data.round);
	playSound('round_start');
	recordEvent('roundReady', { data: data });
};

$lib.Wordstack.turnStart = function(data){
	if(!$data._spectate){
		$stage.game.here.show();
		if(mobile) $stage.game.hereText.val("").focus();
		else $stage.talk.val("").focus();
		$lib.Typing.spaceOn();
	}
	ws.onmessage = _onMessage;
	clearInterval($data._tTime);
	clearTrespasses();
	$data._tTime = addInterval(turnGoing, TICK);
	$data._roundTime = data.roundTime;
	playBGM('jaqwi');
	recordEvent('turnStart', {
		data: data
	});
};
$lib.Wordstack.turnGoing = function(){
	var $rtb = $stage.game.roundBar;
	var bRate;
	var tt;
	
	if(!$data.room) clearInterval($data._tTime);
	$data._roundTime -= TICK;
	
	tt = $data._spectate ? L['stat_spectate'] : ($data._roundTime*0.001).toFixed(1) + L['SECOND'];
	$rtb
		.width($data._roundTime/$data.room.time*0.1 + "%")
		.html(tt);

	$stage.game.turnBar
		.width($data._pool.length > 7 ? "100%" : ($data._pool.length/8*100 + "%"))
		.html($data._pool.length + "/8");
		
	if(!$rtb.hasClass("round-extreme")) if($data._roundTime <= $data._fastTime){
		bRate = $data.bgm.currentTime / $data.bgm.duration;
		if($data.bgm.paused) stopBGM();
		else playBGM('jaqwiF');
		$data.bgm.currentTime = $data.bgm.duration * bRate;
		$rtb.addClass("round-extreme");
	}
};
$lib.Wordstack.turnEnd = function(id, data){
	var $sc = $("<div>")
		.addClass("deltaScore")
		.html("+" + data.score);
	var $uc = $("#game-user-" + id);
	
	if (data.error) {
		$stage.game.here.hide();
		playSound('fail');
	} else if (data.ok){
		if(id == $data.id){
			// 본인이 입력함
			clearTimeout($data._fail);
			$data._pool = data.pool;
			$stage.game.display.html($data._char = $data._pool.join(" ")); // TODO: 클라이언트에서는 자신의 풀 데이터만 볼 수 있도록
			$stage.game.chain.show().html($data._pool.length);

			playSound('mission');
			pushHistory(data.value, data.mean, data.theme, data.wc);
		} else if (data.attack == $data.id) {
			$data._pool = data.otherpool;
			if (!$stage.game.display.hasClass("game-fail-text"))
				$stage.game.display.html($data._char = $data._pool.join(" ")); // TODO: 클라이언트에서는 자신의 풀 데이터만 볼 수 있도록
			$stage.game.chain.show().html($data._pool.length);
			playSound('kung');
		} else if ($data._spectate){
			playSound('mission');
		}
		addScore(id, data.score);
		drawObtainedScore($uc, $sc);
		updateScore(id, getScore(id));
	} else {
		clearInterval($data._tTime);
		// $lib.Typing.spaceOff();
		$stage.game.here.hide();
		stopBGM();
		playSound('horr');
		// addTimeout(drawSpeed, 1000, data.speed);
		if($data._round < $data.room.round) restGoing(10);
	}
};