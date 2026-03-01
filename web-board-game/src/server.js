const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const registerHandler = require(`./socket/gameHandler`); // 게임 관련 소켓 핸들러
const { INITIAL_MAP } = require(`./constants/mapData`);
const { resetGame } = require('./utils/gameUtils');


const app = express();
const server = http.createServer(app);
const io = new Server(server);

const gameState = {
    players: {},
    playerOrder: [],
    currentTurnIndex: 0,
    isTeleportPending: false, // 텔레포트 대기 상태
    taxPool: 50, // 사회복지기금 초기값
    mapInfo: JSON.parse(JSON.stringify(INITIAL_MAP)) // 맵 정보 (소유주 등 동적 정보 포함)
}
resetGame(gameState);
app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    registerHandler(io, socket, gameState);
});
// const PORT = 8080;

// server.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { // '0.0.0.0'을 붙여 외부 접속을 허용합니다.
    console.log(`Server is running on port ${PORT}`);
});