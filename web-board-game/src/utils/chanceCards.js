const ChanceCards = [
    {
        id: 1,
        title: "💰 연금 혜택!",
        description: "축하합니다. 연금 혜택으로 50만원을 받습니다.",
        action: (player) => { player.money += 50; }
    },
    {
        id: 2,
        title: "💰 우승!",
        description: "자동차 경주에서 챔피언이 되었습니다. (당첨금 100만원을 받습니다.)",
        action: (player) => { player.money += 100; }
    },
    {
        id: 3,
        title: "💰 복권 당첨!",
        description: "축하합니다. 복권에 당첨되었습니다. (당첨금 200만원을 받습니다.)",
        action: (player) => { player.money += 200; }
    },
    {
        id: 4,
        title: "💸 병원비 지불",
        description: "병원에서 건강진단을 받았습니다. 병원비 70만원을 지불합니다.",
        action: (player) => { player.money = Math.max(0, player.money - 70); }
    },
    {
        id: 5,
        title: "💸 해외 유학",
        description: "학교 등록금을 내세요. 등록금 100만원을 지불합니다.",
        action: (player) => { player.money = Math.max(0, player.money - 100); }
    },
    {
        id: 6,
        title: "💸 과속운전 벌금",
        description: "과속운전을 하였습니다. 벌칙금 50만원을 지불합니다.",
        action: (player) => { player.money = Math.max(0, player.money - 50); }
    },
    {
        id: 7,
        title: "💸 사회복지기금 배당",
        description: "사회복지기구로 가세요. 출발지를 지나갈 경우, 월급을 받습니다.",
        action: (player) => {  }
    },    
    {
        id: 8,
        title: "✈️ 세계일주 티켓",
        description: "즉시 세계일주 칸으로 이동합니다.",
        action: (player) => { player.position = 21; player.isTeleportPending = true; }
    },
    {
        id: 9,
        title: "🏚️ 건물 수리비",
        description: "노후된 건물을 수리합니다. 수리비 150만원 지출.",
        action: (player) => { player.money = Math.max(0, player.money - 150); }
    },
    {
        id: 10,
        title: "🏚️ 이사",
        description: "뒤로 세 칸 이동합니다.",
        action: (player) => { player.position = Math.max(0, player.position - 3); }
    },
    {
        id: 11,
        title: "🏚️ 이사",
        description: "뒤로 두 칸 이동합니다.",
        action: (player) => { player.position = Math.max(0, player.position - 2); }
    },
    {
        id: 12,
        title: "무인도",
        description: "폭풍을 만났습니다. 무인도로 이동합니다.",
        action: (player) => { player.position = 7; player.lockedTurns = 3; }
    },
    {
        id: 13,
        title: "관광여행",
        description: "부산으로 이동합니다. (부산 소유주에게 통행료를 지불합니다.)",
        action: (player) => { player.position = 15; }
    },
    {
        id: 14,
        title: "관광여행",
        description: "서울로 이동합니다. (서울 소유주에게 통행료를 지불합니다.)",
        action: (player) => { player.position = 27; }
    },
    {
        id: 15,
        title: "통행료 면제권",
        description: "상대방이 소유한 땅에 도착했을 때, 통행료를 면제받습니다. (1회 적용)",
        action: (player) => { player.freePass = 1; }
    },
    {
        id: 16,
        title: "무인도 탈출권",
        description: "무인도에 도착했을 때, 즉시 무인도에서 탈출합니다. (1회 적용)",
        action: (player) => { player.lockedTurnsPass = 1; }
    },
    
    
];module.exports = { ChanceCards };
