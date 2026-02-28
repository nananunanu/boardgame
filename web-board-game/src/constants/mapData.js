const INITIAL_MAP = [
    // 0~6: 상단 변 (7칸)
    { name: "출발지", price: 0, type: "start" }, // 0
    { name: "타이베이", price: 50, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "베이징", price: 80, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "마닐라", price: 80, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "제주도", price: 100, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "싱가포르", price: 100, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "방콕", price: 120, type: "land", owner: null, ownerName: null, buildingLevel: 0 },

    // 7~13: 우측 변 (7칸)
    { name: "무인도", price: 0, type: "special" }, // 7 (모서리)
    { name: "델리", price: 140, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "카이로", price: 140, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "마드리드", price: 160, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "아테네", price: 160, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "로마", price: 180, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "베를린", price: 200, type: "land", owner: null, ownerName: null, buildingLevel: 0 },

    // 14~20: 하단 변 (7칸)
    { name: "사회복지", price: 0, type: "special" }, // 14 (모서리)
    { name: "부산", price: 220, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "시드니", price: 240, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "상파울루", price: 240, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "파리", price: 260, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "런던", price: 260, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "취리히", price: 280, type: "land", owner: null, ownerName: null, buildingLevel: 0 },

    // 21~27: 좌측 변 (7칸)
    { name: "세계여행", price: 0, type: "special" }, // 21 (모서리)
    { name: "찬스", price: 0, type: "special" }, // 22 (기존 요청 칸)
    { name: "국세청", price: 150, type: "special" }, // 23 (세금 징수)
    { name: "캐나다", price: 330, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "로스앤젤레스", price: 340, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "뉴욕", price: 350, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "서울", price: 1000, type: "land", owner: null, ownerName: null, buildingLevel: 0 }
];

module.exports = { INITIAL_MAP };