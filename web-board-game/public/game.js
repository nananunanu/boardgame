const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const rollBtn = document.getElementById('roll-btn');
const resultText = document.getElementById('result-textText');
//PWA를 위한 코드
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log("서비스 워커 등록 완료"));
}
//시작버튼 클릭시
document.getElementById('start-btn').onclick = function() {
    // 접속 시 이름 입력받기
    const myName = prompt("사용할 닉네임을 입력하세요", "Player") || "익명";
    socket.emit('join-game', myName);
    document.getElementById('start-overlay').style.display = 'none';
};
// 주사위 버튼 이벤트
rollBtn.onclick = () => {
    socket.emit('roll-dice');
};
canvas.addEventListener('click', (event) => {
    if (!isTeleporting) return;

    // 클릭한 좌표를 타일 인덱스로 변환
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (event.clientX - rect.left) * (canvas.width / rect.width) / dpr;
    const y = (event.clientY - rect.top) * (canvas.height / rect.height) / dpr;

    mapData.forEach((tile, index) => {
        if (x >= tile.x && x <= tile.x + TILE_W &&
            y >= tile.y && y <= tile.y + TILE_H) {
            
            isTeleporting = false;
            socket.emit('teleport-request', index);
        }
    });
});
// 1. 직사각형 설정을 위한 변수 분리
let COL_COUNT = 9;  // 가로 칸 수
let ROW_COUNT = 5;  // 세로 칸 수
let TILE_W = 0;     // 동적으로 계산될 가로 너비
let TILE_H = 0;     // 동적으로 계산될 세로 높이
const mapData = [];

// 플레이어 상태 관리
let players = {}; 
let isMoving = false; // 현재 애니메이션 진행 중인지 체크
let currentTurnId = ""; // 현재 누구 턴인지 기억할 변수 추가
let currentMap = []; // 서버에서 받은 맵 데이터를 저장할 변수

//사회복지기금
let currentTaxPool = 0;

//세계일주
let isTeleporting = false;

const ENABLE = false;
const DISABLE = true;

//========================================================================================render==================================================================================
// 2. 직사각형 좌표 계산 함수 (시계 방향)
function updateMapData() {
    mapData.length = 0; 
    // 상단 (왼쪽 -> 오른쪽)
    for (let i = 0; i < COL_COUNT - 1; i++) mapData.push({ x: i * TILE_W, y: 0 });
    // 우측 (위 -> 아래)
    for (let i = 0; i < ROW_COUNT - 1; i++) mapData.push({ x: (COL_COUNT - 1) * TILE_W, y: i * TILE_H });
    // 하단 (오른쪽 -> 왼쪽)
    for (let i = COL_COUNT - 1; i > 0; i--) mapData.push({ x: i * TILE_W, y: (ROW_COUNT - 1) * TILE_H });
    // 좌측 (아래 -> 위)
    for (let i = ROW_COUNT - 1; i > 0; i--) mapData.push({ x: 0, y: i * TILE_H });
}

function resizeCanvas() {
    // 1. 기기의 픽셀 비율(DPR) 가져오기 (보통 모바일은 2~3)
    const dpr = window.devicePixelRatio || 1;
    
    // 2. 화면에 보여질 논리적 크기 설정
    const logicalWidth = window.innerWidth - 20;
    const logicalHeight = window.innerHeight - 20;

    // 3. 실제 캔버스의 내부 해상도(픽셀 수)를 비율만큼 확대
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    // 4. 브라우저에 보이는 실제 크기는 원래대로 고정 (CSS 스타일)
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';

    // 5. 모든 그리기 작업에 dpr 배율 적용
    ctx.scale(dpr, dpr);

    // 6. 타일 크기 계산 (논리적 크기 기준)
    TILE_W = logicalWidth / COL_COUNT;
    TILE_H = logicalHeight / ROW_COUNT;

    updateMapData();
    render();
}

// 렌더링 함수 (View)
function render() {
    const dpr = window.devicePixelRatio || 1;
    // 실제 논리적 크기만큼만 지우면 scale(dpr) 덕분에 전체가 지워집니다.
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // 캔버스의 텍스트가 더 부드럽게 그려지도록 설정
    ctx.textBaseline = "middle"; // 세로 정렬 기준을 중간으로
    ctx.imageSmoothingEnabled = true; // 이미지 스무딩 활성화
    
    // 폰트 크기는 세로 높이(TILE_H) 기준으로 맞추는 것이 안전합니다.
    const nameFontSize = Math.floor(TILE_H * 0.18);
    const priceFontSize = Math.floor(TILE_H * 0.15);

    mapData.forEach((tile, index) => {
        const info = currentMap[index] || { name: "...", price: 0 };

        if (info.owner) {
            ctx.fillStyle = players[info.owner] ? players[info.owner].color + '33' : '#eee';
            ctx.fillRect(tile.x, tile.y, TILE_W, TILE_H);
        }

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(tile.x, tile.y, TILE_W, TILE_H);
        
        ctx.fillStyle = '#2c3e50';
        ctx.font = `bold ${nameFontSize}px sans-serif`;
        ctx.textAlign = "center";
        // 위치를 TILE_W, TILE_H에 맞춰 조정
        ctx.fillText(info.name, tile.x + TILE_W / 2, tile.y + TILE_H * 0.3);

        if (info.type === "land") {
            ctx.font = `${priceFontSize}px sans-serif`;
            ctx.fillStyle = "#2980b9";
            ctx.fillText(`${info.price}만`, tile.x + TILE_W / 2, tile.y + TILE_H * 0.55);
        }
        
        if (info.ownerName) {
            ctx.fillStyle = "#c0392b";
            ctx.font = `bold ${priceFontSize}px sans-serif`;
            ctx.fillText(`[${info.ownerName}]`, tile.x + TILE_W / 2, tile.y + TILE_H * 0.85);
        }

        if (index === 11) {
            ctx.fillStyle = "#e67e22"; // 강조색
            ctx.font = `bold ${Math.floor(TILE_H * 0.15)}px sans-serif`;
            ctx.fillText(`기금: ${currentTaxPool}만`, tile.x + TILE_W / 2, tile.y + TILE_H * 0.7);
        }

        if (index === 18) {
            ctx.fillStyle = "#c0392b";
            ctx.font = `bold ${Math.floor(TILE_H * 0.15)}px sans-serif`;
            ctx.fillText(`세금: 150만`, tile.x + TILE_W / 2, tile.y + TILE_H * 0.7);
        }
        if (isTeleporting) {
            ctx.strokeStyle = "rgba(241, 196, 15, 0.5)";
            ctx.lineWidth = 3;
            ctx.strokeRect(tile.x + 5, tile.y + 5, TILE_W - 10, TILE_H - 10);
        }
    });

    Object.keys(players).forEach(id => {
        const p = players[id];
        const pos = mapData[p.position];
        if (!pos) return;

        // 무인도 상태면 캐릭터를 약간 반투명하게 하거나 그림자를 뺌
        const displayName = p.lockedTurns > 0 ? `🏝️ ${p.name}` : p.name;
        ctx.globalAlpha = p.lockedTurns > 0 ? 0.5 : 1.0;

        // 말 크기는 가로/세로 중 작은 쪽 기준으로 설정
        const pieceRadius = Math.min(TILE_W, TILE_H) * 0.25;


        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(pos.x + TILE_W/2, pos.y + TILE_H/2, pieceRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#000";
        ctx.font = `bold ${Math.floor(pieceRadius * 0.8)}px sans-serif`;
        
        ctx.fillText(displayName, pos.x + TILE_W/2, pos.y + TILE_H/2 - pieceRadius - 5); //말에 이름 나타내기

        
        ctx.globalAlpha = 1.0; // 복구
    });
}
// 초기 렌더링
render();
//========================================================================================function========================================================================================
function updateLeaderboard() {
    const list = document.getElementById('player-list');
    list.innerHTML = ""; // 기존 내용을 싹 비움

    Object.keys(players).forEach(id => {
        const p = players[id];
        const row = document.createElement('tr');
        
        // 현재 내 턴인지 확인해서 강조 표시
        const isMyTurn = (id === currentTurnId) ? "⭐" : "";
        const statusTag = p.lockedTurns > 0 ? ` 🏝️(${p.lockedTurns})` : "";

        // 내가 소유한 땅의 개수 계산
        const landCount = currentMap.filter(tile => tile.owner === id).length;

        row.innerHTML = `
            <td style="color: ${p.color}; font-weight: bold;">${isMyTurn} ${p.name}${statusTag}</td>
            <td>${p.money}만원</td>
            <td>${landCount}곳</td>
            <td>${currentMap[p.position] ? currentMap[p.position].name : "출발지"}</td>
        `;
        list.appendChild(row);
    });
}
function moveOneStep(playerId) { // socket "dice-result"에서 유저 움직임 애니메이션을 위한 함수
    return new Promise((resolve) => {
        setTimeout(() => {
            // 현재 위치에서 한 칸 전진 (원형 리스트 순환)
            if (players[playerId]) {
                players[playerId].position = (players[playerId].position + 1) % mapData.length;
                render(); // 화면 갱신 (말 위치 변경 반영)
            }
            resolve();
        }, 300); // 0.3초마다 한 칸씩 이동
    });
}
// 3. 이벤트 리스너 등록 및 초기 실행
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

//========================================================================================socket========================================================================================
socket.on('update-map', (serverMap) => {
    currentMap = serverMap;
    render(); 
});
socket.on('update-taxpool', (pool) => {
    currentTaxPool = pool;
    render(); // 기금 액수가 바뀌면 화면 다시 그리기
});

// 서버로부터 플레이어 전체 정보를 동기화
socket.on('update-players', (serverPlayers) => {
    players = serverPlayers;
    render();
    updateLeaderboard(); // 현황판 갱신 함수 호출
});

socket.on('connect', () => {
    statusText.innerText = `내 ID: ${socket.id} (접속됨)`;
});

// game.js 에 로그 수신 이벤트 추가
socket.on('game-log', (msg) => {
    resultText.innerText = msg; // 결과 텍스트창에 통행료 알림 표시
    console.log(msg);
});

// 서버로부터 주사위 결과 수신 및 이동 로직
socket.on('dice-result', async (data) => { // async : "이 함수는 언제 끝날지 모르는 작업(비동기)을 포함하고 있으니, 기다려줄 준비를 해라"**라고 표시하는 키워드
    const { playerId, value } = data;
    

    resultText.innerText = `결과: ${value} (${players[playerId].name}님)`;

    isMoving = true;
    rollBtn.disabled = DISABLE; 

    for (let i = 0; i < value; i++) {
        await moveOneStep(playerId); // async 과 await는 세트이다 await뒤에 오는 함수는 반드시 Promise를 반환해야 함.("작업이 끝나면 나중에 꼭 알려주겠다는 약속")
    }
    isMoving = false;
    
    const myFinalPos = players[playerId].position;
    
    if (myFinalPos === 17 && socket.id === data.playerId) {
        isTeleporting = true;
        statusText.innerText = "✈️ 세계일주! 이동할 칸을 클릭하세요.";
        statusText.style.color = "#f1c40f";
    }
    
    // ★ 이동 종료 후 땅 구매 체크 로직 추가
    if (socket.id === playerId) { // 내 말일 때만 팝업 띄움
        
        socket.emit('move-complete', myFinalPos);

        const land = currentMap[myFinalPos];
        if (land.type === 'land' && !land.owner && land.price <= players[playerId].money) {
            setTimeout(() => {
                if (confirm(`${land.name}(${land.price}만원)을 구매하시겠습니까?`)) {
                socket.emit('buy-land', myFinalPos);
                }
            }, 300)
        } else {
            //resultText.innerText = `돈이 부족하여 땅을 구매하실 수 없습니다.`;
        }
    }
    // ★ 핵심 수정: 애니메이션이 끝난 후, 내 턴이라면 버튼을 활성화함
    if (socket.id === currentTurnId) {
        rollBtn.disabled = ENABLE;
    }
});

socket.on('turn-change', (activePlayerId) => {
    currentTurnId = activePlayerId; // 현재 턴 ID를 전역 변수에 저장
    console.log("현재 턴:", activePlayerId);

    if (socket.id === activePlayerId) {
        // 이동 중이 아닐 때만 즉시 활성화 (이동 중이면 dice-result 끝날 때 활성화됨)
        if (!isMoving) {
            rollBtn.disabled = ENABLE;
        }
        statusText.innerText = "당신의 차례입니다.";
        statusText.style.color = "#6cd668";
    } else {
        rollBtn.disabled = DISABLE;
        const opponentName = players[activePlayerId] ? players[activePlayerId].name : "상대방";
        statusText.innerText = `${opponentName}님의 차례를 기다리는 중...`;
        statusText.style.color = "red";
    }
    updateLeaderboard();
});

socket.on('player-bankrupt', (targetId) => { //파산 로직
    if (socket.id === targetId) {
        const overlay = document.getElementById('bankruptcy-overlay');
        overlay.style.display = 'flex'; // 모달 표시
        
        // 내 조작 버튼들 비활성화
        rollBtn.disabled = DISABLE;
    }
});
socket.on('player-winner', (targetId) => { //파산 로직
    if (socket.id === targetId) {
        const overlay = document.getElementById('winner-overlay');
        overlay.style.display = 'flex'; // 모달 표시
        
        // 내 조작 버튼들 비활성화
        rollBtn.disabled = DISABLE;
    }
});
//================================================================================================================================================================================

