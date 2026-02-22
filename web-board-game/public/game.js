const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const rollBtn = document.getElementById('roll-btn');
const resultText = document.getElementById('result-textText');

// 1. 보드판 설정 (간단한 사각형 경로)
const BOARD_SIZE = 500;
const TILE_COUNT = 16; // 5x5 형태의 외곽 순환 (4+4+4+4)
const TILE_SIZE = BOARD_SIZE / 5;

// 각 칸의 좌표를 미리 계산 (시계방향)
const mapData = [];
for (let i = 0; i < 5; i++) mapData.push({ x: i * TILE_SIZE, y: 0 }); // 상단
for (let i = 1; i < 5; i++) mapData.push({ x: 4 * TILE_SIZE, y: i * TILE_SIZE }); // 우측
for (let i = 3; i >= 0; i--) mapData.push({ x: i * TILE_SIZE, y: 4 * TILE_SIZE }); // 하단
for (let i = 3; i >= 1; i--) mapData.push({ x: 0, y: i * TILE_SIZE }); // 좌측

// 2. 플레이어 상태 관리
let players = {}; 

// 1. 접속 시 이름 입력받기
const myName = prompt("사용할 닉네임을 입력하세요", "Player") || "익명";
socket.emit('join-game', myName);

// 서버로부터 플레이어 전체 정보를 동기화
socket.on('update-players', (serverPlayers) => {
    players = serverPlayers;
    render();
});

socket.on('connect', () => {
    statusText.innerText = `내 ID: ${socket.id} (접속됨)`;
});

// 3. 서버로부터 주사위 결과 수신 및 이동 로직
socket.on('dice-result', (data) => {
    const { playerId, value } = data;
    resultText.innerText = `결과: ${value} (플레이어: ${playerId.substring(0, 5)}...)`;

    // 플레이어 위치 업데이트 (없으면 생성)
    if (!players[playerId]) {
        players[playerId] = { position: 0, color: '#' + Math.floor(Math.random()*16777215).toString(16) };
    }

    // 핵심 알고리즘: 원형 리스트 순환
    players[playerId].position = (players[playerId].position + value) % mapData.length;
    
    render(); // 상태가 변했으므로 다시 그리기
});

socket.on('turn-change', (activePlayerId) => {
    console.log("현재 턴:", activePlayerId);

    if (socket.id === activePlayerId) {
        rollBtn.disabled = false;
        statusText.innerText = "당신의 차례입니다.";
        statusText.style.color = "blue";
    } else {
        rollBtn.disabled = true
        statusText.innerText = `상대방(${(activePlayerId || "").substring(0,5)})의 차례를 기다리는 중...`;
        statusText.style.color = "red";
    }
})

// 4. 렌더링 함수 (View)
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 보드판 배경 그리기
    mapData.forEach((tile, index) => {
        ctx.strokeStyle = '#333';
        ctx.strokeRect(tile.x, tile.y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#000';
        ctx.font = "12px Arial";
        ctx.textAlign = "left"; // 기본값 복구
        ctx.fillText(index, tile.x + 5, tile.y + 15);
    });

    // 플레이어 말과 이름 그리기
    Object.keys(players).forEach(id => {
        const p = players[id];
        const pos = mapData[p.position];
        if (!pos) return; // 혹시 모를 에러 방지

        // 말 그리기
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(pos.x + TILE_SIZE/2, pos.y + TILE_SIZE/2, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 이름 그리기
        ctx.fillStyle = "black";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(p.name, pos.x + TILE_SIZE/2, pos.y + TILE_SIZE/2 - 20);
    });
}

// 주사위 버튼 이벤트
rollBtn.onclick = () => {
    socket.emit('roll-dice');
};

// 초기 렌더링
render();