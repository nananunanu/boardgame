const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 클라이언트 정적 파일 제공 (public 폴더 내의 파일들)
app.use(express.static('public'));

let players = {}; // { socketId: { name: "닉네임", position: 0, color: "#hex" } }
let playerOrder = []; // "실제 게임 중인" 유저들의 ID 순서
let currentTurnIndex = 0;

io.on('connection', (socket) => {
    // 1. 단순 접속 시에는 아무것도 하지 않고 대기 (이름 입력 전까지)

    // 접속자가 1명뿐이라면 그 사람이 바로 시작할 수 있게 즉시 알림

    socket.on('join-game', (username) => {
        const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        players[socket.id] = { name: username, position: 0, color: color };
        playerOrder.push(socket.id);

        console.log(`${username}님이 입장하셨습니다.`);

        // 모두에게 현재 참가자 명단을 보냄
        io.emit('update-players', players);
        io.emit('turn-change', playerOrder[currentTurnIndex]);
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