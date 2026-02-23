const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let players = {}; // { socketId: { name: "닉네임", position: 0, color: "#hex" } }
let playerOrder = []; // "실제 게임 중인" 유저들의 ID 순서
let currentTurnIndex = 0;

// 클라이언트 정적 파일 제공 (public 폴더 내의 파일들)
app.use(express.static('public'));
//========================================================================================map========================================================================================
// server.js 의 mapInfo를 24칸으로 교체
const mapInfo = [
    { name: "출발지", price: 0, type: "start" },
    { name: "타이베이", price: 50, type: "land", owner: null },
    { name: "베이징", price: 60, type: "land", owner: null },
    { name: "제주도", price: 80, type: "land", owner: null },
    { name: "싱가포르", price: 100, type: "land", owner: null },
    { name: "방콕", price: 110, type: "land", owner: null },
    { name: "무인도", price: 0, type: "special" }, // 6번 칸 (모서리)

    { name: "독도", price: 200, type: "land", owner: null },
    { name: "마드리드", price: 220, type: "land", owner: null },
    { name: "아테네", price: 230, type: "land", owner: null },
    { name: "로마", price: 250, type: "land", owner: null },
    { name: "사회복지", price: 0, type: "special" }, // 11번 칸 (모서리)

    { name: "베를린", price: 280, type: "land", owner: null },
    { name: "부산", price: 320, type: "land", owner: null },
    { name: "파리", price: 350, type: "land", owner: null },
    { name: "런던", price: 350, type: "land", owner: null },
    { name: "취리히", price: 380, type: "land", owner: null },
    { name: "세계여행", price: 0, type: "special" }, // 17번 칸 (모서리)

    { name: "시드니", price: 420, type: "land", owner: null },
    { name: "토론토", price: 420, type: "land", owner: null },
    { name: "로스앤젤레스", price: 450, type: "land", owner: null },
    { name: "화성", price: 500, type: "land", owner: null },
    { name: "찬스", price: 0, type: "special" },
    { name: "뉴욕", price: 600, type: "land", owner: null }  // 23번 칸
];

//========================================================================================socket========================================================================================
io.on('connection', (socket) => {
    // 1. 단순 접속 시에는 아무것도 하지 않고 대기 (이름 입력 전까지)

    // 접속자가 1명뿐이라면 그 사람이 바로 시작할 수 있게 즉시 알림

    socket.on('join-game', (username) => {
        const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        players[socket.id] = { 
            name: username, 
            position: 0, 
            color: color, 
            money: 300 // 시작 자금 1000만원 설정
        };
        playerOrder.push(socket.id);

        console.log(`${username}님이 입장하셨습니다.`);

        // 모두에게 현재 참가자 명단을 보냄
        io.emit('update-players', players);
        io.emit('turn-change', playerOrder[currentTurnIndex]);
        // 모두에게 맵 정보 보냄
        io.emit('update-map', mapInfo); // 맵 정보 전체 방송
    })
    
    // 주사위 굴리기 요청 처리
    socket.on('roll-dice', () => {
        // 현재 턴인 사람의 ID가 실제 존재하는지 확인
        const activeId = playerOrder[currentTurnIndex];
        if (socket.id !== activeId || !players[activeId]) return;

        const diceValue = Math.floor(Math.random() * 6) + 1;
        // 핵심: 서버에서 결과를 계산하여 모두에게 방송(Broadcast)
        io.emit('dice-result', { 
            playerId: socket.id, 
            value: diceValue, 
            name: players[socket.id].name // 이름 추가 전송
        });

        // 턴 교대 알고리즘: (현재인덱스 + 1) % 전체인원
        currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;
        io.emit('turn-change', playerOrder[currentTurnIndex]);
    });
    
    socket.on('move-complete', (finalPos) => {
        const player = players[socket.id];
        if (!player) return;

        player.position = finalPos; // 실제 위치 업데이트
        const land = mapInfo[finalPos];

        // ★ 통행료 지불 체크 ★
        if (land.type === 'land' && land.owner && land.owner !== socket.id) {
            const owner = players[land.owner];
            const fee = Math.floor(land.price * 0.5); // 땅값의 50%를 통행료로 설정

            if (player.money >= fee) {
                player.money -= fee;
                owner.money += fee;
                // 모든 유저에게 누가 누구에게 얼마 줬는지 알림
                io.emit('game-log', `${player.name}님이 ${owner.name}님의 땅(${land.name})에 도착하여 통행료 ${fee}만원을 지불했습니다.`);
            } else {
                // 파산 처리 (잔액 0원)
                owner.money += player.money
                player.money = 0;
                handleBankruptcy(socket.id);
            }
        }
        io.emit('update-players', players); // 변경된 상태(돈, 위치)를 모두에게 알림
    });

    // 2. 땅 구매 요청 처리
    socket.on('buy-land', (tileIndex) => {
        const land = mapInfo[tileIndex];
        const player = players[socket.id];

        // 검증: 내 턴인지, 돈이 충분한지, 이미 주인이 있는지
        if (land.type === 'land' && !land.owner && player.money >= land.price) {
            player.money -= land.price; // 돈 차감
            land.owner = socket.id; // 소유주 등록
            land.ownerName = player.name; // 렌더링용 이름

            // 변경된 정보 모두에게 방송
            io.emit('update-players', players);
            io.emit('update-map', mapInfo);
            console.log(`${player.name}님이 ${land.name}을 구매했습니다.`);
        }
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            const name = players[socket.id].name;
            delete players[socket.id];
            playerOrder = playerOrder.filter(id => id !== socket.id);
            if (currentTurnIndex >= playerOrder.length) currentTurnIndex = 0;
            
            io.emit('update-players', players);
            io.emit('turn-change', playerOrder[currentTurnIndex]);
            console.log(`${name} 퇴장`);
        }
    });
});
//========================================================================================socket========================================================================================

//========================================================================================function========================================================================================
// server.js 하단에 추가
function handleBankruptcy(socketId) {
    const player = players[socketId];
    if (!player) return;

    console.log(`[파산] ${player.name}님이 파산하였습니다.`);
    io.emit('game-log', `📢 ${player.name}님이 자금 부족으로 파산하였습니다!`);

    // 1. 소유했던 모든 땅 초기화
    mapInfo.forEach(tile => {
        if (tile.owner === socketId) {
            tile.owner = null;
            tile.ownerName = null;
        }
    });

    // 2. 플레이어 목록 및 순서에서 제거
    delete players[socketId];
    playerOrder = playerOrder.filter(id => id !== socketId);

    // 3. 턴 인덱스 보정 (사람이 줄었으므로 현재 인덱스가 범위를 넘지 않게)
    if (currentTurnIndex >= playerOrder.length) {
        currentTurnIndex = 0;
    }

    // 4. 정보 갱신 방송
    io.emit('update-players', players);
    io.emit('update-map', mapInfo);
    
    // 5. 남은 인원 체크 (게임 종료 조건)
    if (playerOrder.length === 1) {
        const winner = players[playerOrder[0]];
        io.emit('game-log', `🏆 게임 종료! 승리자: ${winner.name}`);
        // 필요 시 게임 리셋 로직 추가
    } else {
        io.emit('turn-change', playerOrder[currentTurnIndex]);
    }
}
//========================================================================================function========================================================================================

//========================================================================================server========================================================================================
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});