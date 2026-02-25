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
let COL_COUNT = 8;  // 가로 칸 수
let ROW_COUNT = 8;  // 세로 칸 수
let TILE_W = 0;     // 동적으로 계산될 가로 너비
let TILE_H = 0;     // 동적으로 계산될 세로 높이
const mapData = [];

// 플레이어 상태 관리
let players = {}; 
let isMoving = false; // 현재 애니메이션 진행 중인지 체크
let currentTurnId = ""; // 현재 누구 턴인지 기억할 변수 추가
let currentMap = []; // 서버에서 받은 맵 데이터를 저장할 변수

//사회복지기금
let currentTaxPool = 50;

//세계일주
let isTeleporting = false;

const ENABLE = false;
const DISABLE = true;

let diceAnim = {
    active: false,
    showResult: false, // 결과 주사위를 화면에 띄워둘 것인가?
    value: 1,
    frame: 0,
    maxFrame: 40, // 애니메이션 지속 시간 (프레임)
    yOffset: 0,   // 점프 높이
    rotation: 0   // 회전 각도
};

//========================================================================================render==================================================================================
// 2. 직사각형 좌표 계산 함수 (시계 방향)
function updateMapData() {
    mapData.length = 0;
    
    const dpr = window.devicePixelRatio || 1;
    const centerX = (canvas.width / dpr) / 2;
    const centerY = (canvas.height / dpr) / 2;

    // 1. 맵 전체의 가로/세로 크기 계산
    // 다이아몬드 형태이므로 전체 가로 폭은 (한 변의 칸 수 - 1) * TILE_W 입니다.
    const totalMapWidth = (COL_COUNT - 1) * TILE_W;
    const totalMapHeight = (COL_COUNT - 1) * TILE_H;

    // 2. 시작점 재계산 (전체 폭의 절반만큼 왼쪽으로 이동)
    // centerX에서 가로 폭의 절반을 빼지 않고, 
    // 다이아몬드 꼭짓점 기준 좌표계로 다시 잡습니다.
    const startX = centerX; 
    const startY = centerY - (totalMapHeight / 2) - 20; //세로 위치조정 +는 내림 -는 올림

    const stepX = TILE_W / 2;
    const stepY = TILE_H / 2;

    // --- 타일 배치 로직 ---
    
    // 1. 상단 -> 우측
    for (let i = 0; i < COL_COUNT - 1; i++) {
        mapData.push({ 
            x: startX + (i * stepX) - (TILE_W / 2), // TILE_W/2를 빼서 타일 자체가 중앙에 오도록 함
            y: startY + (i * stepY) 
        });
    }
    // 2. 우측 -> 하단
    for (let i = 0; i < COL_COUNT - 1; i++) {
        mapData.push({ 
            x: startX + ((COL_COUNT - 1) * stepX) - (i * stepX) - (TILE_W / 2), 
            y: startY + ((COL_COUNT - 1) * stepY) + (i * stepY) 
        });
    }
    // 3. 하단 -> 좌측
    for (let i = 0; i < COL_COUNT - 1; i++) {
        mapData.push({ 
            x: startX - (i * stepX) - (TILE_W / 2), 
            y: startY + (totalMapHeight) - (i * stepY) 
        });
    }
    // 4. 좌측 -> 상단
    for (let i = 0; i < COL_COUNT - 1; i++) {
        mapData.push({ 
            x: startX - ((COL_COUNT - 1) * stepX) + (i * stepX) - (TILE_W / 2), 
            y: startY + ((COL_COUNT - 1) * stepY) - (i * stepY) 
        });
    }
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = window.innerWidth - 0; //타일 크기 조정 상수
    const logicalHeight = window.innerHeight - 0;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';
    ctx.scale(dpr, dpr);

    // 정사각형 다이아몬드 배치를 위해 타일 크기 최적화
    // 전체 맵 너비가 화면 너비의 90% 정도 차지하도록 설정
    TILE_W = (logicalWidth * 0.7) / (COL_COUNT - 1);
    TILE_H = TILE_W * 0.5; // 3D 느낌을 위해 가로세로 비율 조정 (0.5~0.6 추천)

    updateMapData();
    render();
}

// 렌더링 함수 (View)
/**
 * 마작 블록 스타일의 입체 타일을 그리는 함수
 */
function drawMahjongTile(tile, info, index) {
    const padding = 1;
    const x = tile.x;
    const y = tile.y;
    const w = TILE_W;
    const h = TILE_H;
    const depth = 12; // 블록의 두께 (입체감)
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    // 1. 블록 옆면 (입체 두께) - 먼저 그려야 상판에 가려짐
    ctx.fillStyle = "#bdc3c7"; // 블록 옆면 색상
    ctx.beginPath();
    ctx.moveTo(x, centerY); // 왼쪽 끝
    ctx.lineTo(x, centerY + depth); 
    ctx.lineTo(centerX, y + h + depth); // 아래 끝
    ctx.lineTo(x + w, centerY + depth); // 오른쪽 끝
    ctx.lineTo(x + w, centerY);
    ctx.lineTo(centerX, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#95a5a6";
    ctx.stroke();

    // 2. 블록 윗면 (마름모 상판)
    // 소유자가 있으면 해당 유저 색상, 없으면 흰색 계열
    if (info.owner && players[info.owner]) {
        ctx.fillStyle = players[info.owner].color;
    } else {
        ctx.fillStyle = "#ffffff";
    }

    ctx.beginPath();
    ctx.moveTo(centerX, y);          // 위
    ctx.lineTo(x + w, centerY);      // 오른쪽
    ctx.lineTo(centerX, y + h);      // 아래
    ctx.lineTo(x, centerY);          // 왼쪽
    ctx.closePath();
    ctx.fill();
    
    // 상판 테두리
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. 내부 텍스트 및 정보
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 세계일주(17), 무인도(6), 기금(11), 세금(18) 등 특수 아이콘/텍스트 처리
    let title = info.name;
    if (index === 0) title = "🚩 " + title; //출발지
    if (index === 7) title = "🏝️ " + title; // 무인도 
    if (index === 21) title = "✈️ " + title; // 세계여행
    if (index === 23) title = "💸 " + title; // 세금

    ctx.fillStyle = "#2c3e50";
    ctx.font = `bold ${Math.floor(TILE_H * 0.2)}px sans-serif`;
    ctx.fillText(title, centerX, centerY - TILE_H * 0.1);

    // 가격/소유주 표시
    if (info.type === "land" && !info.ownerName) {
        ctx.font = `${Math.floor(TILE_H * 0.15)}px sans-serif`;
        ctx.fillStyle = "#2980b9";
        ctx.fillText(`${info.price}만`, centerX, centerY + TILE_H * 0.15);
    } else if (info.ownerName) {
        ctx.font = `bold ${Math.floor(TILE_H * 0.15)}px sans-serif`;
        ctx.fillStyle = "#c0392b";
        ctx.fillText(`[${info.ownerName}]`, centerX, centerY + TILE_H * 0.15);
    }

    // 특수 정보 (기금/세금 액수)
    if (index === 14) {
        ctx.fillStyle = "#e67e22";
        ctx.font = `bold ${Math.floor(TILE_H * 0.15)}px sans-serif`;
        ctx.fillText(`${currentTaxPool}만`, centerX, centerY + TILE_H * 0.2);
    }
    if (index === 23) {
        ctx.fillStyle = "#c0392b";
        ctx.font = `bold ${Math.floor(TILE_H * 0.15)}px sans-serif`;
        ctx.fillText(`150만`, centerX, centerY + TILE_H * 0.2);
    }

    // 4. 세계일주 텔레포트 중일 때 강조 (노란 후광)
    if (isTeleporting) {
        ctx.strokeStyle = "rgba(241, 196, 15, 0.8)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(centerX, y - 5);
        ctx.lineTo(x + w + 5, centerY);
        ctx.lineTo(centerX, y + h + 5);
        ctx.lineTo(x - 5, centerY);
        ctx.closePath();
        ctx.stroke();
    }
}
function draw3DDice(ctx, x, y, size, value, rotation, yOffset) {
    ctx.save();
    ctx.translate(x, y - yOffset);
    ctx.rotate(rotation);

    const s = size / 2;
    const skew = s * 0.5; // 입체 깊이감

    // 1. 상단 면 (Top Face) - 위로 솟아오른 모양
    ctx.fillStyle = "#ecf0f1"; // 가장 밝은 면
    ctx.beginPath();
    ctx.moveTo(-s, -s);
    ctx.lineTo(-s + skew, -s - skew); // 왼쪽 위로
    ctx.lineTo(s + skew, -s - skew);  // 오른쪽 위로
    ctx.lineTo(s, -s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. 우측 면 (Right Face) - 위쪽 대각선으로 연결
    ctx.fillStyle = "#bdc3c7"; // 중간 어두운 면
    ctx.beginPath();
    ctx.moveTo(s, -s);
    ctx.lineTo(s + skew, -s - skew); // 위쪽 대각선 방향으로 수정
    ctx.lineTo(s + skew, s - skew);  // 아래쪽도 평행하게 수정
    ctx.lineTo(s, s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. 정면 (Front Face) - 기준이 되는 면
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-s, -s, size, size);
    ctx.strokeRect(-s, -s, size, size);

    // 4. 주사위 눈 (Front Face에만 그림)
    ctx.fillStyle = value === 1 ? "#e74c3c" : "#2c3e50";
    const dotR = size * 0.1;
    const drawDot = (dx, dy) => {
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
    };

    if (value % 2 === 1) drawDot(0, 0);
    if (value > 1) { drawDot(-s/2, -s/2); drawDot(s/2, s/2); }
    if (value > 3) { drawDot(s/2, -s/2); drawDot(-s/2, s/2); }
    if (value === 6) { drawDot(-s/2, 0); drawDot(s/2, 0); }

    ctx.restore();
}

function render() {
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.imageSmoothingEnabled = true;

    // 1. 모든 타일 그리기
    // 1. [핵심] 그리기 순서 정렬 (Painter's Algorithm)
    // Y좌표가 낮은(뒤에 있는) 타일을 먼저 그리고, Y가 높은(앞에 있는) 타일을 나중에 그립니다.
    const sortedIndices = [...mapData.keys()].sort((a, b) => {
        return mapData[a].y - mapData[b].y;
    });

    // 2. 정렬된 순서대로 타일 그리기
    sortedIndices.forEach(index => {
        const tile = mapData[index];
        const info = currentMap[index] || { name: "...", price: 0 };
        drawMahjongTile(tile, info, index);
    });

    // 2. 플레이어 말 그리기
    Object.keys(players).forEach(id => {
        const p = players[id];
        const pos = mapData[p.position];
        if (!pos) return;

        const centerX = pos.x + TILE_W / 2;
        const centerY = pos.y + TILE_H / 2;
        const pieceRadius = Math.min(TILE_W, TILE_H) * 0.2;

        ctx.globalAlpha = p.lockedTurns > 0 ? 0.5 : 1.0;

        // 플레이어 캐릭터 (입체감을 위해 그림자 추가)
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pieceRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 닉네임 표시
        ctx.fillStyle = "#000";
        const displayName = p.lockedTurns > 0 ? `🏝️ ${p.name}` : p.name;
        ctx.font = `bold ${Math.floor(pieceRadius * 0.9)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(displayName, centerX, centerY - pieceRadius - 10);
        
        ctx.globalAlpha = 1.0;


        // 주사위 애니메이션이 활성 상태일 때만 중앙에 그림
        if (diceAnim.showResult) {
        const dpr = window.devicePixelRatio || 1;
        const centerX = (canvas.width / dpr) / 2;
        const centerY = (canvas.height / dpr) / 2;
        
        // 주사위 그림자 (바닥에 고정)
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 20, 30 + (diceAnim.yOffset * 0.1), 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D 주사위 본체
        draw3DDice(ctx, centerX, centerY, 60, diceAnim.value, diceAnim.rotation, diceAnim.yOffset);
        }
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
socket.on('dice-result',  (data) => { // async : "이 함수는 언제 끝날지 모르는 작업(비동기)을 포함하고 있으니, 기다려줄 준비를 해라"**라고 표시하는 키워드
    const { playerId, value } = data;
    
    // 애니메이션 설정 시작
    diceAnim.active = true;
    diceAnim.showResult = true; // 결과 표시 모드 ON
    diceAnim.value = value;
    diceAnim.frame = 0;

    function animateDice() {
        if (diceAnim.frame < diceAnim.maxFrame) {
            diceAnim.frame++;
            
            // 점프 곡선 (이차함수 사용)
            const progress = diceAnim.frame / diceAnim.maxFrame;
            diceAnim.yOffset = Math.sin(progress * Math.PI) * 150; // 최대 150px 높이 점프
            diceAnim.rotation += 0.3; // 회전 속도
            
            // 애니메이션 중엔 임의의 숫자 표시
            if (diceAnim.frame % 3 === 0) diceAnim.value = Math.floor(Math.random() * 6) + 1;
            
            render(); 
            requestAnimationFrame(animateDice);
        } else {
            // 애니메이션 종료 후 실제 값 설정 및 이동 시작
            diceAnim.active = false; // 애니메이션은 끝남
            diceAnim.yOffset = 0; // 바닥에 착지
            diceAnim.rotation = 0; // 정방향으로 멈춤
            diceAnim.value = value; // 최종 값 고정
            
            
            render(); // 착지한 모습 갱신
            startMove(playerId, value); // 기존 이동 로직 호출
        }
    }
    animateDice();
    //resultText.innerText = `결과: ${value} (${players[playerId].name}님)`;
});

async function startMove(playerId, value) {
    isMoving = true;
    rollBtn.disabled = DISABLE;
    
    for (let i = 0; i < value; i++) {
        await moveOneStep(playerId); // async 과 await는 세트이다 await뒤에 오는 함수는 반드시 Promise를 반환해야 함.("작업이 끝나면 나중에 꼭 알려주겠다는 약속")
    }
    isMoving = false;

    // ★ 이동 종료
    if (socket.id === playerId) { // 내 말일 때만 팝업 띄움
        socket.emit('move-complete', players[playerId].position);
    }   
    // ★ 핵심 수정: 애니메이션이 끝난 후, 내 턴이라면 버튼을 활성화함
    if (socket.id === currentTurnId) {
        rollBtn.disabled = ENABLE;
    }
}

socket.on('start-teleport', () => {
    isTeleporting = true;
    statusText.innerText = "✈️ 세계일주! 이동할 칸을 클릭하세요.";
    statusText.style.color = "#f1c40f";
    // 렌더링을 호출하여 캔버스에 선택 가이드(노란 테두리 등)를 표시
    render(); 
});

socket.on('ask-buy-land', (data) => {
    // 서버가 물어볼 때만 팝업을 띄움
    setTimeout(() => {
        if (confirm(`${data.name}(${data.price}만원)을 구매하시겠습니까?`)) {
            socket.emit('buy-land', data.index);
        }
    }, 300);
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

