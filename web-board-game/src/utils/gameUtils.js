const { INITIAL_MAP } = require('../constants/mapData');

/**
 * 게임 상태를 완전히 초기화하는 함수
 * @param {Object} gameState - 리팩토링된 server.js의 gameState 객체
 */
function resetGame(gameState) {
    // 1. 맵 정보 초기화 (깊은 복사를 통해 원본 INITIAL_MAP 상태로 되돌림)
    // 원본 데이터의 불변성을 유지하기 위해 JSON 방식을 사용합니다.
    gameState.mapInfo = JSON.parse(JSON.stringify(INITIAL_MAP));

    // 2. 플레이어 관련 정보 초기화
    gameState.players = {};
    gameState.playerOrder = [];
    gameState.currentTurnIndex = 0;

    // 3. 기타 게임 시스템 변수 초기화
    gameState.taxPool = 50;

    console.log("🔄 게임이 초기화되었습니다.");
}

module.exports = { resetGame };