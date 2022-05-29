$lib.Wordstack.roundReady = function(data){
	var i, len = $data.room.game.title.length;
	var $l;
	
	clearBoard();
	$data._roundTime = $data.room.time * 1000;
	$stage.game.display.html(data.pool[$data.id].join(" ")); // TODO: 클라이언트에는 자신의 풀 데이터만 보내도록
	// $stage.game.chain.show().html($data.chain = 0);
	// if($data.room.opts.mission){
	// 	$stage.game.items.show().css('opacity', 1).html($data.mission = data.mission);
	// }
	drawRound(data.round);
	playSound('round_start');
	recordEvent('roundReady', { data: data });
};