const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let players = {}; // { socketId: { name: "닉네임", position: 0, color: "#hex" } }
let playerOrder = []; // "실제 게임 중인" 유저들의 ID 순서
let currentTurnIndex = 0;
let taxPool = 50; // 누적된 사회복지기금

// 클라이언트 정적 파일 제공 (public 폴더 내의 파일들)
app.use(express.static('public'));
//========================================================================================map========================================================================================
const mapInfo = [
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
            money: 300, // 시작 자금 200만원 설정
            lockedTurns: 0, // 무인도 갇힘 상태 체크용
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

        const player = players[activeId];
        const diceValue = Math.floor(Math.random() * 6) + 1;

        // 이전 위치 저장
        const oldPos = player.position;
        // 새 위치 계산 (24칸 기준)
        const newPos = (oldPos + diceValue) % mapInfo.length;

        if (player.lockedTurns > 0) {
            player.lockedTurns--;
            io.emit('game-log', `🏝️ ${player.name}님은 무인도에 갇혀 있습니다. (남은 턴: ${player.lockedTurns})`);
            
            // 주사위를 굴리지 않고 바로 다음 사람에게 턴을 넘김
            currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;
            io.emit('turn-change', playerOrder[currentTurnIndex]);
            io.emit('update-players', players); // 턴 수 감소 반영
            return;
        }   

        //서버에서 결과를 계산하여 모두에게 방송(Broadcast)
        io.emit('dice-result', { 
            playerId: socket.id, 
            value: diceValue, 
            name: players[socket.id].name // 이름 추가 전송
        });

        // 월급 체크: 새 위치가 이전 위치보다 숫자가 작아졌다면 한 바퀴를 돌았다는 뜻!
        // (단, 0번 칸에 딱 멈추는 경우도 포함)
        if (newPos < oldPos || (oldPos + diceValue >= mapInfo.length)) {
            const salary = 200; // 월급 금액
            player.money += salary;
            io.emit('game-log', `💰 ${player.name}님이 한 바퀴를 완주하여 월급 ${salary}만원을 받았습니다!`);
        }

        
    });
    
    socket.on('move-complete', (finalPos) => {
        handleMoveComplete(socket, finalPos);
    });

    // 땅 구매 요청 처리
    socket.on('buy-land', (tileIndex) => {
        const land = mapInfo[tileIndex];
        const player = players[socket.id];

        // 검증: 내 턴인지, 돈이 충분한지, 이미 주인이 있는지
        if (land.type === 'land' && !land.owner && player.money >= land.price) {
            player.money -= land.price; // 돈 차감
            land.owner = socket.id; // 소유주 등록
            land.ownerName = player.name; // 렌더링용 이름

            // 변경된 정보 업데이트
            io.emit('update-players', players);
            io.emit('update-map', mapInfo);
            console.log(`${player.name}님이 ${land.name}을 구매했습니다.`);
        }
    });
    // [server.js] 텔레포트 요청 처리 추가
    socket.on('teleport-request', (targetIndex) => {
        const player = players[socket.id];
        
        if (player && player.position === 21) { // 현재 위치가 세계일주(21번)이고, 본인 턴일 때만 허용
            player.position = targetIndex;
            player.isTeleportPending = false; // 텔레포트 대기 상태 해제
            io.emit('game-log', `✈️ ${player.name}님이 세계일주를 통해 ${mapInfo[targetIndex].name}(으)로 이동했습니다!`);
            
            handleMoveComplete(socket, targetIndex);
        }
    });
    socket.on('build-building', (data) => {
        const { index, cost } = data;
        const land = mapInfo[index];
        const player = players[socket.id];

        if (player.position !== index) return; // 현재 위치와 건물 지으려는 위치가 일치하는지 확인

        if (player.money < cost) {
            socket.emit('game-log', `🚫 ${player.name}님, 건물을 짓기에 돈이 부족합니다! (필요: ${cost}만원, 현재: ${player.money}만원)`);
            return;
        }
        if (land.owner === socket.id && player.money >= cost && land.buildingLevel < 3) {
            player.money -= cost;
            land.buildingLevel += 1; // 레벨업
            const buildingNames = ["", "별장", "빌라", "호텔"];
            io.emit('game-log', `${player.name}님이 ${land.name}에 [ ${buildingNames[land.buildingLevel]} ]을 지었습니다.`);
            
            io.emit('update-map', mapInfo);
            io.emit('update-players', players);
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
function buildBuilding(socket, tileIndex) {
    const land = mapInfo[tileIndex];
    const player = players[socket.id];
    
    const standardCost = land.price * 0.3; // 건물 기본 비용
    
    const buildingNames = ["별장", "빌라", "호텔"]; // 건물 레벨에 따른 이름 배열
    const buildingCosts = [standardCost, land.price + standardCost / 6, standardCost * 2]; // 건물 레벨에 따른 비용 배열 (예시: 1레벨은 기본 비용, 2레벨은 땅값 + 기본비용/6, 3레벨은 기본 비용의 2배)

    if (!land || !player) return;

    socket.emit('ask-build-building', { name: land.name, buildingName: buildingNames[land.buildingLevel], cost: buildingCosts[land.buildingLevel], index: tileIndex }); // 건물 건설 의사 묻기

}
function computeFee(price, level) {
  const mult = [1, 2, 5, 10][level] || 0;
  return Math.floor(price * mult);
}
function handleMoveComplete(socket, finalPos) {
        const player = players[socket.id];
        if (!player) return;

        player.position = finalPos; // 실제 위치 업데이트
        const land = mapInfo[finalPos];

        // ★ 통행료 지불 체크 ★
        if (land.type === 'land' && land.owner && land.owner !== socket.id) {
            const owner = players[land.owner];
            const baseFee = Math.floor(land.price * 0.3); // 기본 통행료는 땅값의 30%

            const fee = computeFee(baseFee, land.buildingLevel); // 건물 레벨에 따른 통행료 계산

            if (player.money >= fee) {
                player.money -= fee;
                owner.money += fee;
                // 모든 유저에게 누가 누구에게 얼마 줬는지 알림
                console.log(`${player.name}님이 ${owner.name}님의 땅(${land.name})에 도착하여 통행료 ${fee}만원을 지불했습니다.`);
                io.emit('game-log', `${player.name}님이 ${owner.name}님의 땅(${land.name})에 도착하여 통행료 ${fee}만원을 지불했습니다.`);
            } else {
                // 파산 처리 (잔액 0원)
                console.log(`${player.name}님이 ${owner.name}님의 땅(${land.name})에 도착하여 통행료 ${fee}만원을 지불했습니다.`);
                owner.money += player.money
                player.money = 0;
                handleBankruptcy(socket.id);
            }
        }
        else if (land.type === 'land' && !land.owner && player.money >= land.price) {
            // 클라이언트에게 "구매 의사"를 물어보라고 신호를 보냄
            socket.emit('ask-buy-land', { index: finalPos, name: land.name, price: land.price });
        }
        else if (land.type === 'land' && land.owner === socket.id) {
            
            buildBuilding(socket, finalPos); // 건물 건설 시도 (소유주이므로 바로 시도)

            console.log(`${player.name}님이 자신의 땅(${land.name})에 도착했습니다.`);
            io.emit('game-log', `${player.name}님이 자신의 땅에 도착했습니다. 건물을 구매할 수 있습니다.`);
        }
        else if (finalPos === 7) {  // ★ 6번 칸 무인도 도착 체크
            player.lockedTurns = 3; // 3턴 동안 이동 불가
            io.emit('game-log', `🚨 [사건] ${player.name}님이 무인도에 표류되었습니다! (3턴간 이동 불가)`);
        } 
        else if (finalPos === 14) {// 11번 칸: 기금 수령
            if (taxPool > 0) {
            player.money += taxPool;
            io.emit('game-log', `🎉 [대박] ${player.name}님이 사회복지기금 ${taxPool}만원을 모두 수령했습니다!`);
            taxPool = 0; // 수령 후 초기화
            } else {
                io.emit('game-log', `😊 ${player.name}님이 사회복지기금 칸에 방문했지만, 쌓인 기금이 없습니다.`);
            }
        }
        else if (finalPos === 21) {
            player.isTeleportPending = true; // 세계일주 대기 상태 설정
            io.emit('game-log', `✈️ ${player.name}님이 세계일주 칸에 도착했습니다!`);
        }
        else if (finalPos === 23) { //  18번칸: 국세청 (기금적립)
            const tax = 150; // 세금 금액
            if (player.money >= tax) {
                player.money -= tax;
                taxPool += tax;
                io.emit('game-log', `💸 [납세] ${player.name}님이 국세청에서 세금 ${tax}만원을 납부했습니다. (기금에 적립됨)`);
            } else {
                // 돈이 부족하면 파산 대신 남은 돈만이라도 징수 (혹은 파산 처리 가능)
                taxPool += player.money;
                player.money = 0;
                io.emit('game-log', `💸 [징수] ${player.name}님이 잔액이 부족하여 남은 자산을 세금으로 납부했습니다.`);
            }
        }
        io.emit('update-players', players); // 변경된 상태(돈, 위치)를 모두에게 알림
        io.emit('update-taxpool', taxPool); // 사회복지기구 현 기금상태 업데이트

        // 턴 교대 알고리즘: (현재인덱스 + 1) % 전체인원
        currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;
        io.emit('turn-change', playerOrder[currentTurnIndex]);
}
function handleBankruptcy(socketId) {
    const player = players[socketId];
    if (!player) return;

    // 파산한 본인에게 알림창 띄우기
    setTimeout(() => {
        io.emit('player-bankrupt', socketId);
    }, 2000)

    console.log(`[파산] ${player.name}님이 파산하였습니다.`);
    io.emit('game-log', `📢 ${player.name}님이 자금 부족으로 파산하였습니다!`);

    // 소유했던 모든 땅 초기화
    mapInfo.forEach(tile => {
        if (tile.owner === socketId) {
            tile.owner = null;
            tile.ownerName = null;
        }
    });

    // 파산한 플레이어 목록 및 순서에서 제거
    delete players[socketId];
    playerOrder = playerOrder.filter(id => id !== socketId);

    // 턴 인덱스 보정 (사람이 줄었으므로 현재 인덱스가 범위를 넘지 않게)
    if (currentTurnIndex >= playerOrder.length) {
        currentTurnIndex = 0;
    }

    // 업데이트
    io.emit('update-players', players);
    io.emit('update-map', mapInfo);
    
    // 5. 남은 인원 체크 (게임 종료 조건)
    if (playerOrder.length === 1) {
        const winner = players[playerOrder[0]];
        io.emit('game-log', `🏆 게임 종료! 승리자: ${winner.name}`);
        setTimeout(() => {
            io.emit('player-winner', playerOrder[0]);
        }, 2000)
        resetGame();
        // 필요 시 게임 리셋 로직 추가
    } else {
        io.emit('turn-change', playerOrder[currentTurnIndex]);
    }
}
//========================================================================================function========================================================================================
// 게임 전체 초기화 함수
function resetGame() {
    // 1. 맵 정보 초기화 (소유주 모두 제거)
    mapInfo.forEach(tile => {
        if (tile.type === 'land') {
            tile.owner = null;
            tile.ownerName = null;
            tile.buildingLevel = 0;
        }
    });

    // 2. 플레이어 상태 초기화
    // Object.keys(players).forEach(id => {
    //     players[id].position = 0;
    //     players[id].money = 300; // 초기 자금으로 리셋
    //     players[id].lockedTurns = 0;
    // });

    // 3. 게임 시스템 변수 초기화
    players = {};
    playerOrder = [];
    currentTurnIndex = 0;
    taxPool = 50;

    // 4. 모든 클라이언트에 초기화 신호 전송
    io.emit('update-map', mapInfo);
    io.emit('update-players', players);
    io.emit('update-taxpool', taxPool);
    io.emit('turn-change', null); // 턴 없음 상태로 초기화
}
//========================================================================================server========================================================================================
const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});