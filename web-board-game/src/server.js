const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const registerHandler = require(`./socket/gameHandler`); // 게임 관련 소켓 핸들러
const { INITIAL_MAP } = require(`./constants/mapData`);
const { resetGame, getPublicRooms } = require('./utils/gameUtils');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, '../public')));

const rooms = {}; // {"방번호": {players, mapInfo, taxPool ...}}

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    socket.emit('room-list', getPublicRooms(rooms))

    socket.on('join-game', (roomId, username) => {
        if (!roomId || !username) return;

        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = username;

        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: {},
                playerOrder: [],
                currentTurnIndex: 0,
                taxPool: 50,
                mapInfo: JSON.parse(JSON.stringify(INITIAL_MAP))
            }
        }
        const currentRoom = rooms[roomId];
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        currentRoom.players[socket.id] = {
            id: socket.id,
            name: username,
            position: 0,
            color: color,
            money: 400,
            lockedTurns: 0,
            lockedTurnsPass: 0, // 무인도 탈출권 1회 제공
            freePass: 0, // 통행료 면제권 1회 제공
            isTeleportPending: false // 세계일주 대기 상태
        };
        currentRoom.playerOrder.push(socket.id);

        io.to(roomId).emit('update-players', currentRoom.players);
        io.to(roomId).emit('turn-change', currentRoom.playerOrder[currentRoom.currentTurnIndex]);
        io.to(roomId).emit('update-map', currentRoom.mapInfo);
        io.to(roomId).emit('game-log', `📢 ${username}님이 입장하셨습니다.`);
    });
    registerHandler(io, socket, rooms);
});
// const PORT = 8080;

// server.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { // '0.0.0.0'을 붙여 외부 접속을 허용합니다.
    console.log(`Server is running on port ${PORT}`);
});