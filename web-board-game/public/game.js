const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const rollBtn = document.getElementById('roll-btn');
const resultText = document.getElementById('result-textText');


// 보드판 설정 (간단한 사각형 경로)
const BOARD_SIZE = 500;
const TILE_COUNT = 16; // 5x5 형태의 외곽 순환 (4+4+4+4)
const TILE_SIZE = BOARD_SIZE / 5;

const ENABLE = false;
const DISABLE = true;

// 각 칸의 좌표를 미리 계산 (시계방향)
const mapData = [];
for (let i = 0; i < 5; i++) mapData.push({ x: i * TILE_SIZE, y: 0 }); // 상단
for (let i = 1; i < 5; i++) mapData.push({ x: 4 * TILE_SIZE, y: i * TILE_SIZE }); // 우측
for (let i = 3; i >= 0; i--) mapData.push({ x: i * TILE_SIZE, y: 4 * TILE_SIZE }); // 하단
for (let i = 3; i >= 1; i--) mapData.push({ x: 0, y: i * TILE_SIZE }); // 좌측

// 플레이어 상태 관리
let players = {}; 

// 접속 시 이름 입력받기
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

// 서버로부터 주사위 결과 수신 및 이동 로직
let isMoving = false; // 현재 애니메이션 진행 중인지 체크

let currentTurnId = ""; // 현재 누구 턴인지 기억할 변수 추가

socket.on('dice-result', async (data) => { // async : "이 함수는 언제 끝날지 모르는 작업(비동기)을 포함하고 있으니, 기다려줄 준비를 해라"**라고 표시하는 키워드
    const { playerId, value } = data;
    resultText.innerText = `결과: ${value} (${players[playerId].name}님)`;

    isMoving = true;
    rollBtn.disabled = DISABLE; 

    for (let i = 0; i < value; i++) {
        await moveOneStep(playerId); // async 과 await는 세트이다 await뒤에 오는 함수는 반드시 Promise를 반환해야 함.("작업이 끝나면 나중에 꼭 알려주겠다는 약속")
    }

    isMoving = false;

    // ★ 핵심 수정: 애니메이션이 끝난 후, 내 턴이라면 버튼을 활성화함
    if (socket.id === currentTurnId) {
        rollBtn.disabled = ENABLE;
    }
});
// 한 칸 이동을 처리하는 Promise 함수 (이게 빠져있어서 안 움직였을 겁니다)
function moveOneStep(playerId) {
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

socket.on('turn-change', (activePlayerId) => {
    currentTurnId = activePlayerId; // 현재 턴 ID를 전역 변수에 저장
    console.log("현재 턴:", activePlayerId);

    if (socket.id === activePlayerId) {
        // 이동 중이 아닐 때만 즉시 활성화 (이동 중이면 dice-result 끝날 때 활성화됨)
        if (!isMoving) {
            rollBtn.disabled = ENABLE;
        }
        statusText.innerText = "당신의 차례입니다.";
        statusText.style.color = "blue";
    } else {
        rollBtn.disabled = DISABLE;
        const opponentName = players[activePlayerId] ? players[activePlayerId].name : "상대방";
        statusText.innerText = `${opponentName}님의 차례를 기다리는 중...`;
        statusText.style.color = "red";
    }
});

// 렌더링 함수 (View)
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