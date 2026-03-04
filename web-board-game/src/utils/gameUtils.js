const { INITIAL_MAP } = require('../constants/mapData');

/**
 * 게임 상태를 완전히 초기화하는 함수
 * @param {Object} room - 리팩토링된 server.js의 gameState 객체
 */
function resetGame(room) {
    // 1. 맵 정보 초기화 (깊은 복사를 통해 원본 INITIAL_MAP 상태로 되돌림)
    // 원본 데이터의 불변성을 유지하기 위해 JSON 방식을 사용합니다.

    // const roomId = socket.roomId;
    // if (roomId && rooms[roomId]) {
    //     delete rooms[roomId].players[socket.id];
    //     // 방에 아무도 없으면 방 삭제
    //     if (Object.keys(rooms[roomId].players).length === 0) {
    //         delete rooms[roomId];
    //     } else {
    //         io.to(roomId).emit('update-game', rooms[roomId]);
    //     }
    // }
        
    room.mapInfo = JSON.parse(JSON.stringify(INITIAL_MAP));

    // 2. 플레이어 관련 정보 초기화
    room.players = {};
    room.playerOrder = [];
    room.freePass = 0;
    room.lockedTurnsPass = 0;
    room.currentTurnIndex = 0;

    // 3. 기타 게임 시스템 변수 초기화
    room.taxPool = 50;

    console.log("🔄 게임이 초기화되었습니다.");
}
function getPublicRooms(rooms) {
    const list = [];
    if (!rooms) return list; // 방어 코드 추가
    
    for (const id in rooms) {
        list.push({
            title: rooms[id].title,
            roomId: id,
            playerCount: Object.keys(rooms[id].players).length,
            // 방장 이름이나 상태 등을 추가할 수 있습니다.
        });
    }
    return list;
}
module.exports = { resetGame, getPublicRooms };