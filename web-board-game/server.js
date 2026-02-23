const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 클라이언트 정적 파일 제공 (public 폴더 내의 파일들)
app.use(express.static('public'));

// game.js 상단
const mapInfo = [
    { name: "출발지", price: 0, type: "start" },
    { name: "서울", price: 10, type: "land", owner: null },
    { name: "도쿄", price: 20, type: "land", owner: null },
    { name: "시드니", price: 30, type: "land", owner: null },
    { name: "무인도", price: 40, type: "special" }, // 4번 칸
    { name: "런던", price: 50, type: "land", owner: null },
    { name: "파리", price: 60, type: "land", owner: null },
    { name: "베이징", price: 70, type: "land", owner: null },
    { name: "찬스", price: 0, type: "special" }, // 8번 칸
    { name: "베를린", price: 80, type: "land", owner: null },
    { name: "로마", price: 90, type: "land", owner: null },
    { name: "방콕", price: 100, type: "land", owner: null },
    { name: "세계여행", price: 0, type: "special" }, // 12번 칸
    { name: "마드리드", price: 110, type: "land", owner: null },
    { name: "카이로", price: 120, type: "land", owner: null },
    { name: "뉴욕", price: 130, type: "land", owner: null }
];

let players = {}; // { socketId: { name: "닉네임", position: 0, color: "#hex" } }
let playerOrder = []; // "실제 게임 중인" 유저들의 ID 순서
let currentTurnIndex = 0;

io.on('connection', (socket) => {
    // 1. 단순 접속 시에는 아무것도 하지 않고 대기 (이름 입력 전까지)

    // 접속자가 1명뿐이라면 그 사람이 바로 시작할 수 있게 즉시 알림

    socket.on('join-game', (username) => {
        const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        players[socket.id] = { 
            name: username, 
            position: 0, 
            color: color, 
            money: 1000 // 시작 자금 1000만원 설정
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
        if (socket.id !== playerOrder[currentTurnIndex]) return;

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
                io.emit('game-log', `${player.name}님이 파산 위기입니다!`);
            }
        }

        // 변경된 상태(돈, 위치)를 모두에게 알림
        io.emit('update-players', players);
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

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});