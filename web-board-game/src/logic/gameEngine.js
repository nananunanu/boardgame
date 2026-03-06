/**
 * GameEngine: 소켓 통신 없이 "게임 규칙"만 계산하는 모듈
 */

module.exports = {
    calculateFee,
    getNextTurnIndex,
    getBuildingCost,
    rollDice
};

// 통행료 계산 (순수 함수)
function calculateFee(land, player) {
    if (!land.owner || land.owner === player.id) return 0;
    const baseFee = Math.floor(land.price * 0.3);
    const multipliers = [1, 2, 5, 10]; // 레벨별 배수
    return baseFee * (multipliers[land.buildingLevel] || 1);
}

// 다음 턴 인덱스 계산
function getNextTurnIndex(currentIndex, totalPlayers) {
    if (totalPlayers === 0) return 0;
    return (currentIndex + 1) % totalPlayers;
}

// 건물 건설 비용 계산
function getBuildingCost(land) {
    const standardCost = land.price * 0.3;
    const costs = [
        standardCost, 
        land.price + standardCost / 6, 
        standardCost * 2
    ];
    return Math.floor(costs[land.buildingLevel] || 0);
}

// 주사위 굴리기 결과 (1~6)
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

