const socket = io();
const statusText = document.getElementById('status');
const turnText = document.getElementById('your-turn');
const rollBtn = document.getElementById('roll-btn');
const resultText = document.getElementById('result-textText');
const refreshBtn = document.getElementById('refresh-btn')

const canvas = document.getElementById('gameCanvas');

import { Renderer } from './renderer.js';
// import { Animator } from './animator.js';
// import { UIManager } from './uiManager.js';

//PWA를 위한 코드
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log("서비스 워커 등록 완료"));
}
//시작버튼 클릭시
document.getElementById('start-btn').onclick = function() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('lobby-overlay').style.display = 'flex';
};
// 방 생성 버튼
document.getElementById('create-room-btn').onclick = () => {
    const roomId = prompt("생성할 방 번호를 입력하세요 (숫자/문자)", Math.floor(Math.random() * 9000 + 1000));
    if (roomId) joinRoom(roomId);
};
// 새로고침 버튼
refreshBtn.onclick = () => {
    // 1. 버튼을 잠시 비활성화 (연타 방지)
    refreshBtn.disabled = true;
    refreshBtn.innerText = "🔄 갱신 중...";

    // 2. 서버에 목록 요청
    socket.emit('request-room-list');

    // 3. 1초 뒤에 버튼 다시 활성화 (또는 서버 응답 시 활성화)
    setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerText = "🔄 새로고침";
    }, 500);
};
window.joinRoom = function(roomId) {
    const myName = prompt("사용할 닉네임을 입력하세요", "Player") || "익명";
    socket.emit('join-game', roomId, myName);
    document.getElementById('lobby-overlay').style.display = 'none';
    document.getElementById('start-overlay').style.display = 'none';
};
// 주사위 버튼 이벤트
rollBtn.onclick = () => {
    rollBtn.disabled = DISABLE
    socket.emit('roll-dice');
};
canvas.addEventListener('click', (event) => {
    // 텔레포트 모드가 아니면 무시
    if (!state.isTeleporting) return;

    const rect = canvas.getBoundingClientRect();
    
    /**
     * [핵심 1] 논리적 좌표 계산
     * Renderer에서 ctx.scale(dpr, dpr)을 사용 중이므로, 
     * 마우스 좌표를 캔버스의 실제 픽셀 해상도가 아닌 'CSS 논리적 크기' 비율로만 맞춥니다.
     */
    const mouseX = (event.clientX - rect.left) * (rect.width === canvas.clientWidth ? 1 : canvas.clientWidth / rect.width);
    const mouseY = (event.clientY - rect.top) * (rect.height === canvas.clientHeight ? 1 : canvas.clientHeight / rect.height);

    const HALF_W = state.TILE_W / 2;
    const HALF_H = state.TILE_H / 2;

    let targetIndex = -1;

    // [핵심 2] 판정 루프
    // Painter's Algorithm 역순(앞에 보이는 것부터)으로 검사합니다.
    for (let i = state.mapData.length - 1; i >= 0; i--) {
        const tile = state.mapData[i];

        /**
         * [핵심 3] 중심점 보정
         * Renderer의 updateMapData를 보면:
         * tile.x는 마름모의 왼쪽 끝점 좌표입니다.
         * tile.y는 마름모의 위쪽 끝점 좌표입니다.
         * 따라서 중심점(centerX, centerY)은 다음과 같습니다.
         */
        const centerX = tile.x + HALF_W;
        const centerY = tile.y + HALF_H;

        const dx = Math.abs(mouseX - centerX);
        const dy = Math.abs(mouseY - centerY);

        // 마름모 내부 판정 공식
        if ((dx / HALF_W) + (dy / HALF_H) <= 1.0) {
            targetIndex = i;
            break; // 가장 위에 있는 타일을 찾으면 중단
        }
    }

    // 결과 처리
    if (targetIndex !== -1) {
        console.log(`선택된 타일 인덱스: ${targetIndex}`);
        state.isTeleporting = false;
        // 서버에 텔레포트 요청
        socket.emit('teleport-request', targetIndex);
        Renderer.renderAll(state);
    }
});
const state = {
    // 1. 캔버스 및 컨텍스트 (그리기 도구)
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas').getContext('2d'),

    // 2. 맵 레이아웃 설정
    COL_COUNT: 8,      // 가로 칸 수
    ROW_COUNT: 8,      // 세로 칸 수 (필요시)
    TILE_W: 0,         // Renderer.resizeCanvas()에서 계산됨 동적으로 계산될 가로높이
    TILE_H: 0,         // Renderer.resizeCanvas()에서 계산됨 동적으로 계산될 세로높이
    mapData: [],       // 타일의 x, y 좌표들이 저장될 배열

    // 3. 게임 데이터 (서버와 동기화되는 정보)
    players: {},       // 접속한 플레이어 객체들 { id: { name, money, position, ... } }
    currentMap: [],    // 서버에서 받은 각 타일의 상세 정보 (이름, 가격, 소유주 등)
    currentTaxPool: 50, // 사회복지기금 누적액

    // 4. 주사위 애니메이션 상태
    diceAnim: {
        active: false,
        showResult: false, // 결과 주사위를 화면에 유지할지 여부
        value: 1,          // 주사위 눈금
        frame: 0,
        maxFrame: 40,
        yOffset: 0,        // 점프 높이
        rotation: 0        // 회전 각도
    },

    // 5. 플레이어 조작 및 상태값
    currentTurnId: "",    // 현재 누구의 턴인지 (socket.id)
    isMoving: false,      // 캐릭터 이동 애니메이션 중인지 여부
    isTeleporting: false  // 세계여행(텔레포트) 선택 모드인지 여부
};
const ENABLE = false;
const DISABLE = true;

// 이벤트 리스너 등록 및 초기 실행
window.addEventListener('resize', () => {
    Renderer.resizeCanvas(state);
    Renderer.renderAll(state); // 계산 후 다시 그리기
});

Renderer.renderAll(state);
Renderer.resizeCanvas(state)
//========================================================================================function========================================================================================
function updatePersonalUI() {
    const myId = socket.id;
    if (!myId || !state.players || !state.players[myId]) return;

    const me = state.players[myId];

    // 요소들을 미리 가져옵니다.
    const nameElem = document.getElementById('my-name-display');
    const moneyElem = document.getElementById('my-money-display');
    const landElem = document.getElementById('my-lands-display');
    const coverElem = document.getElementById('bankbook-cover');

    // 요소가 존재할 때만 실행 (TypeError 방지)
    if (nameElem) nameElem.innerText = me.name;
    if (moneyElem) moneyElem.innerText = me.money.toLocaleString();
    
    // 내 땅 개수 계산
    if (landElem) {
        const myLandCount = state.currentMap.filter(tile => tile.owner === myId).length;
        landElem.innerText = myLandCount;
    }

    // 보너스: 통장 커버 색상을 내 캐릭터 색상으로 변경
    if (coverElem && me.color) {
        coverElem.style.backgroundColor = me.color;
    }
}
// function updateLeaderboard() {
//     const list = document.getElementById('player-list');
//     list.innerHTML = ""; // 기존 내용을 싹 비움

//     Object.keys(players).forEach(id => {
//         const p = players[id];
//         const row = document.createElement('tr');
        
//         // 현재 내 턴인지 확인해서 강조 표시
//         const isMyTurn = (id === currentTurnId) ? "⭐" : "";
//         const statusTag = p.lockedTurns > 0 ? ` 🏝️(${p.lockedTurns})` : "";

//         // 내가 소유한 땅의 개수 계산
//         const landCount = currentMap.filter(tile => tile.owner === id).length;

//         row.innerHTML = `
//             <td style="color: ${p.color}; font-weight: bold;">${isMyTurn} ${p.name}${statusTag}</td>
//             <td>${p.money}만원</td>
//             <td>${landCount}곳</td>
//             <td>${currentMap[p.position] ? currentMap[p.position].name : "출발지"}</td>
//         `;
//         list.appendChild(row);
//     });
// }
function moveOneStep(playerId) { // socket "dice-result"에서 유저 움직임 애니메이션을 위한 함수
    return new Promise((resolve) => {
        const player = state.players[playerId];
        if (!player) return resolve();
        const startIdx = player.position;
        const nextIdx = (startIdx + 1) % state.mapData.length;
        const from = state.mapData[startIdx];
        const to = state.mapData[nextIdx];
        const frames = 30; // 점프속도 조절
        let frame = 0;

        function animate() {
            frame++;
            const t = frame / frames;
            // 선형 보간
            player.animX = from.x + (to.x - from.x) * t;
            player.animY = from.y + (to.y - from.y) * t;
            // 점프 곡선
            player.animOffset = Math.sin(t * Math.PI) * Math.min(state.TILE_W, state.TILE_H) * 0.5; // 높이조정 상수

            Renderer.renderAll(state);
            if (frame < frames) {
                requestAnimationFrame(animate);
            } else {
                // 애니메이션 종료
                delete player.animX;
                delete player.animY;
                delete player.animOffset;
                player.position = nextIdx;
                Renderer.renderAll(state);
                resolve();
            }
        }
        animate();
    });
}
/**
 * 커스텀 모달을 띄우고 사용자의 선택을 Promise로 반환하는 함수
 */
function showCustomModal(title, message, condition = 0) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const titleElem = document.getElementById('modal-title');
        const msgElem = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        cancelBtn.style.display = 'flex';
        confirmBtn.style.display = 'flex'; // 상황에 맞는 텍스트 변경

        titleElem.innerText = title;
        msgElem.innerHTML = message;    
        modal.style.display = 'flex';

        if (condition === 1) {
            cancelBtn.style.display = 'none';
            confirmBtn.innerText = "확인"; // 상황에 맞는 텍스트 변경
        }         
        else if (condition === 2) { //통행료 면제권 모달
            cancelBtn.style.display = 'none';
            confirmBtn.style.display = 'none'; // 상황에 맞는 텍스트 변경

            setTimeout(() => {
                modal.style.display = 'none';
                resolve(true);
            }, 2000); // 2초 후 자동으로 모달 닫기
        } 
        else {
            cancelBtn.style.display = 'inline-block';
            confirmBtn.innerText = "확인";
            cancelBtn.innerText = "취소";
        }

        // 확인 클릭 시
        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };

        // 취소 클릭 시
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}
function showCustomModalChanceCard(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('chance-card');
        const titleElem = document.getElementById('card-title');
        const msgElem = document.getElementById('card-description');

        titleElem.innerText = title;
        msgElem.innerHTML = message;
        modal.style.display = 'flex';

        setTimeout(() => {
            modal.style.display = 'none';
            resolve(true);
        }, 3000); // 2초 후 자동으로 모달 닫기
    
    });
}
//========================================================================================socket========================================================================================

socket.on('room-list', (roomList) => {
    const roomUl = document.getElementById('room-ul');
    roomUl.innerHTML = ""; // 기존 목록 초기화

    if (roomList.length === 0) {
        roomUl.innerHTML = "<p>생성된 방이 없습니다. 새 방을 만들어보세요!</p>";
        return;
    }

    roomList.forEach(room => {
        const li = document.createElement('li');
        li.className = "room-item";
        li.innerHTML = `
            <span class="room-info">🏠 방 번호: ${room.roomId} (${room.playerCount}명 접속 중)</span>
            <button onclick="joinRoom('${room.roomId}')">입장하기</button>
        `;
        roomUl.appendChild(li);
    });
});
socket.on('update-map', (serverMap) => {
    state.currentMap = serverMap;
    Renderer.renderAll(state); 
});
socket.on('update-taxpool', (pool) => {
    state.currentTaxPool = pool;
    Renderer.renderAll(state); // 기금 액수가 바뀌면 화면 다시 그리기
});

// 서버로부터 플레이어 전체 정보를 동기화 (기존 코드 보완)
socket.on('update-players', (serverPlayers) => {
    // 1. 리셋 처리
    if (!serverPlayers || Object.keys(serverPlayers).length === 0) {
        state.players = {};
        Renderer.renderAll(state);
        return;
    }

    // 2. 동기화
    Object.keys(serverPlayers).forEach(id => {
        const sPlayer = serverPlayers[id];
        if (!state.players[id]) {
            state.players[id] = sPlayer;
        } else {
            // 위치(position)는 애니메이션 중일 때 덮어쓰지 않도록 주의
            state.players[id].money = sPlayer.money;
            state.players[id].name = sPlayer.name;
            state.players[id].color = sPlayer.color;
            state.players[id].lockedTurns = sPlayer.lockedTurns;
            state.players[id].isTeleportPending = sPlayer.isTeleportPending;
            
            if (state.players[id].animX === undefined) {
                state.players[id].position = sPlayer.position;
            }
        }
    });

    // 방에서 나간 유저 제거
    Object.keys(state.players).forEach(id => {
        if (!serverPlayers[id]) delete state.players[id];
    });

    Renderer.renderAll(state);
    updatePersonalUI();
});

socket.on('connect', () => {
    // statusText.innerText = `내 ID: ${socket.id} (접속됨)`;
});

// game.js 에 로그 수신 이벤트 추가
socket.on('game-log', (msg) => {
    statusText.style.color = "#000";
    statusText.innerText = msg;
    console.log(msg);
});

// 서버로부터 주사위 결과 수신 및 이동 로직
socket.on('dice-result',  (data) => { // async : "이 함수는 언제 끝날지 모르는 작업(비동기)을 포함하고 있으니, 기다려줄 준비를 해라"**라고 표시하는 키워드
    const { playerId, value } = data;
    
    // 애니메이션 설정 시작
    state.diceAnim.active = true;
    state.diceAnim.showResult = true; // 결과 표시 모드 ON
    state.diceAnim.value = value;
    state.diceAnim.frame = 0;

    function animateDice() {
        if (state.diceAnim.frame < state.diceAnim.maxFrame) {
            state.diceAnim.frame++;
            
            // 점프 곡선 (이차함수 사용)
            const progress = state.diceAnim.frame / state.diceAnim.maxFrame;
            state.diceAnim.yOffset = Math.sin(progress * Math.PI) * 150; // 최대 150px 높이 점프
            state.diceAnim.rotation += 0.3; // 회전 속도
            
            // 애니메이션 중엔 임의의 숫자 표시
            if (state.diceAnim.frame % 3 === 0) state.diceAnim.value = Math.floor(Math.random() * 6) + 1;
            
            Renderer.renderAll(state); 
            requestAnimationFrame(animateDice);
        } else {
            // 애니메이션 종료 후 실제 값 설정 및 이동 시작
            state.diceAnim.active = false; // 애니메이션은 끝남
            state.diceAnim.yOffset = 0; // 바닥에 착지
            state.diceAnim.rotation = 0; // 정방향으로 멈춤
            state.diceAnim.value = value; // 최종 값 고정
            
            
            Renderer.renderAll(state); // 착지한 모습 갱신
            startMove(playerId, value); // 기존 이동 로직 호출
        }
    }
    animateDice();
    //resultText.innerText = `결과: ${value} (${players[playerId].name}님)`;
});

async function startMove(playerId, value) {
    state.isMoving = true;
    rollBtn.disabled = DISABLE;
    
    for (let i = 0; i < value; i++) {
        await moveOneStep(playerId); // async 과 await는 세트이다 await뒤에 오는 함수는 반드시 Promise를 반환해야 함.("작업이 끝나면 나중에 꼭 알려주겠다는 약속")
    }
    state.isMoving = false;

    // ★ 이동 종료
    if (socket.id === playerId) { // 내 말일 때만 팝업 띄움
        socket.emit('move-complete', state.players[playerId].position);
    }   
    // ★ 핵심 수정: 애니메이션이 끝난 후, 내 턴이라면 버튼을 활성화함
    if (socket.id === state.currentTurnId) {
        rollBtn.disabled = ENABLE;
    }
}

socket.on('showModalHandler-payFee', async (data) => {
    if (data.isPayfee) {
        const tableMessage = `
            <table style="width:100%; border-collapse: collapse; margin-top:10px;">
                <tr><td style="text-align:left;">소유주</td><td style="text-align:right;">${data.details.owner}</td></tr>
                <tr><td style="text-align:left;">도시명</td><td style="text-align:right;">${data.details.city}</td></tr>
                <tr style="border-bottom: 1px dashed #ccc;"><td colspan="2"></td></tr>
                <tr><td style="text-align:left;">기본료</td><td style="text-align:right;">${data.details.baseFee}만</td></tr>
                <tr><td style="text-align:left;">건물(${data.details.building})</td><td style="text-align:right;">x${data.details.multiplier}</td></tr>
                <tr style="border-top: 2px solid #2c3e50; font-weight:bold; font-size:1.2em;">
                    <td style="text-align:left;">총 금액</td><td style="text-align:right; color:#e74c3c;">${data.details.total}</td>
                </tr>
            </table>
        `;
        
        // 기존 showCustomModal 호출 (innerHTML을 사용하는 버전이어야 함)
        await new Promise(r => setTimeout(r, 300));
        await showCustomModal(data.title, tableMessage, 1);
    }
});
            
// [game.js] 입금 확인 모달 (받는 유저용)
socket.on('showModalHandler-notify-income', async (data) => {
    const incomeHTML = `
        <table style="width:100%; border-collapse: collapse; margin-top:10px;">
            <tr><td style="text-align:left;">방문자(지불인)</td><td style="text-align:right;">${data.details.payerName}</td></tr>
            <tr><td style="text-align:left;">소유주(수취인)</td><td style="text-align:right;">${data.details.owner}</td></tr>
            <tr style="border-bottom: 1px dashed #ccc;"><td colspan="2"></td></tr>
            <tr><td style="text-align:left;">기본료</td><td style="text-align:right;">${data.details.baseFee}만</td></tr>
            <tr><td style="text-align:left;">건물(${data.details.building})</td><td style="text-align:right;">x${data.details.multiplier}</td></tr>
            <tr style="border-top: 2px solid #2c3e50; font-weight:bold; font-size:1.2em;">
                <td style="text-align:left;">총 금액</td><td style="text-align:right; color: #27ae60;">+${data.details.total}</td>
            </tr>
        </table>
    `;

    await new Promise(r => setTimeout(r, 300));
    await showCustomModal(data.title, incomeHTML, 1);
});
// 찬스카드 모달
socket.on('showModalHandler-chance-card', async (data) => { //❓
    await new Promise(r => setTimeout(r, 300));
    await showCustomModalChanceCard(data.title, `${data.description}(${data.name}님)`);
});
// 프리패스 모달
socket.on('showModalHandler-freePass', async (data) => {
    await new Promise(r => setTimeout(r, 300));
    await showCustomModal(data.title, data.message, 2);
});
socket.on('ask-buy-land', async (data) => {
    await new Promise(r => setTimeout(r, 300));
    const confirmed = await showCustomModal("부동산 매입", `${data.name}(${data.price}만원)을 구매하시겠습니까?`);
    
    if (confirmed) {
        socket.emit('buy-land', data.index);
    }
});
socket.on('ask-build-building', async (data) => {
    if (!data.buildingName) return; // 건물 이름이 없으면 건물 건설을 하지 않음
    await new Promise(r => setTimeout(r, 100));
    
    const confirmed = await showCustomModal("건물 건설", `${data.name}에 [${data.buildingName}]을 짓겠습니까?\n(비용: ${data.cost}만원)`);
    if (confirmed) {
        socket.emit('build-building', data);
    }
});

socket.on('turn-change', (activePlayerId) => {
    state.currentTurnId = activePlayerId; // 현재 턴 ID를 전역 변수에 저장
    console.log("현재 턴:", activePlayerId);

    if (socket.id === activePlayerId) {
        // 이동 중이 아닐 때만 즉시 활성화 (이동 중이면 dice-result 끝날 때 활성화됨)
        console.log(state.players[activePlayerId].isTeleportPending);

        if (state.players[activePlayerId].isTeleportPending === true) {
            state.isTeleporting = true; 
            rollBtn.disabled = DISABLE; // 주사위 대신 클릭 유도
            statusText.innerText = "✈️ 세계일주 차례입니다! 이동할 칸을 클릭하세요.";
        } else {
            rollBtn.disabled = ENABLE;
            turnText.innerText = "YOUR TURN.";
            resultText.innerText = "주사위를 굴려주세요!";
        }
    } else {
        rollBtn.disabled = DISABLE;
        const opponentName = state.players[activePlayerId] ? state.players[activePlayerId].name : "상대방";
        turnText.innerText = `WAIT.`;
        resultText.innerText = `${opponentName}님의 턴입니다.`;
    }
    Renderer.renderAll(state);
    // updateLeaderboard();
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