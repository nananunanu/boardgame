const INITIAL_MAP = [
    // 0~7: 상단 변 (7칸)
    // 출발지 16, 찬스 4 20, 세계여행 8, 국세청 10, 사회복지 0, 무인도 24
    { name: "사회복지", price: 0, type: "special" }, // 0 14 (모서리)
    { name: "멕시코", price: 220, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "그리스", price: 240, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "스페인", price: 240, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "찬스", price: 0, type: "special" }, // 4 (찬스)
    { name: "이탈리아", price: 260, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "스위스", price: 280, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "프랑스", price: 280, type: "land", owner: null, ownerName: null, buildingLevel: 0 },

    // 8~15: 좌측 변 (8칸)
    { name: "세계여행", price: 0, type: "special" }, // 8 (모서리)
    { name: "러시아", price: 300, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "국세청", price: 150, type: "special" }, // 10 (세금 징수)
    { name: "영국", price: 330, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "캐나다", price: 340, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "미국", price: 350, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "중국", price: 280, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "서울", price: 1000, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    
    // 16~23: 하단 변 (7칸)
    { name: "출발지", price: 0, type: "start" }, // 16
    { name: "태국", price: 50, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "베트남", price: 80, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "필리핀", price: 80, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "찬스", price: 0, type: "special" }, // 20 (찬스)
    { name: "말레이시아", price: 100, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "인도네시아", price: 120, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "싱가포르", price: 280, type: "land", owner: null, ownerName: null, buildingLevel: 0 },

    // 24~31: 좌상단 변 (7칸)
    { name: "무인도", price: 0, type: "special" }, // 24 (모서리)
    { name: "인도", price: 140, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "사우디아라비아", price: 140, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "[관광지] 독도", price: 160, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "이집트", price: 160, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "찬스", price: 0, type: "special" }, // 29 (찬스)
    { name: "아르헨티나", price: 200, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
    { name: "브라질", price: 280, type: "land", owner: null, ownerName: null, buildingLevel: 0 },
];


module.exports = { INITIAL_MAP };