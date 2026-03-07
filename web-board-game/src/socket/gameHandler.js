const { resetGame, getPublicRooms } = require('../utils/gameUtils');
const { ChanceCards } = require('../utils/chanceCards');
// const Engine = require('../logic/gameEngine');

module.exports = (io, socket, rooms, activeUsers) => {
    // const { players, mapInfo } = gameState;
    socket.on('move-complete', (finalPos) => {
        handleMoveComplete(io, socket, finalPos, rooms[socket.roomId], socket.roomId);
    });
    
    // 주사위 굴리기 요청 처리
    socket.on('roll-dice', () => {
        const roomId = socket.roomId;
        const room = rooms[roomId];
        
        if (!room || !room.playerOrder) {
            console.error(`[Error] Room ${roomId} not found.`);
            return;
        }

        const activeId = room.playerOrder[room.currentTurnIndex];
        const player = room.players[activeId];

        if (socket.id !== activeId || !room.players[activeId]) return;

        // 무인도 체크
        if (player.lockedTurns > 0 && player.lockedTurnsPass === 0) {
            player.lockedTurns--;
            io.to(roomId).emit('game-log', `🏝️ ${player.name}님은 무인도에 갇혀 있습니다. (남은 턴: ${player.lockedTurns})`);
            nextTurn(io, room, roomId);
            return;
        }

        const diceValue = 24; // 테스트용 고정값
        // const diceValue = Math.floor(Math.random() * 6) + 1;
        const oldPos = player.position;
        const newPos = (oldPos + diceValue) % room.mapInfo.length;

        io.to(roomId).emit('dice-result', { playerId: socket.id, value: diceValue, name: player.name });

        // 월급 지급 (한 바퀴 완주 / 출발지점 인덱스가 0일경우)
        // if (newPos < oldPos || (oldPos + diceValue >= room.mapInfo.length)) {
        //     player.money += 200;
        //     io.to(roomId).emit('game-log', `💰 ${player.name}님이 월급 200만원을 받았습니다!`);
        // }
        const MAP_LENGTH = room.mapInfo.length;
        const START_INDEX = 16; // 출발지 인덱스

        // 1. 이동 전 위치(oldPos)에서 주사위(diceValue)만큼 더했을 때 START_INDEX를 '지나가는지' 체크
        // % MAP_LENGTH를 하지 않은 순수 이동 거리값으로 계산하는 것이 가장 정확합니다.
        const passedStart = (oldPos < START_INDEX && (oldPos + diceValue) >= START_INDEX) || 
                            (oldPos >= START_INDEX && (oldPos + diceValue) >= START_INDEX + MAP_LENGTH);

        if (passedStart) {
            player.money += 200;
            io.to(roomId).emit('game-log', `💰 ${player.name}님이 출발지를 통과하여 월급 200만원을 받았습니다!`);
        }

    });
    // 땅 구매 요청 처리
    socket.on('buy-land', (tileIndex) => {
        const roomId = socket.roomId;
        const room = rooms[roomId];
        if (!room) return;

        // 수정된 부분: playerOrder를 거치지 않고 직접 찾습니다.
        const player = room.players[socket.id]; 
        const land = room.mapInfo[tileIndex];

        // 방어 코드: 플레이어나 땅 정보가 없는 경우 예외 처리
        if (!player || !land) return;

        if (land.type === 'land' && !land.owner && player.money >= land.price) {
            player.money -= land.price;
            land.owner = socket.id;
            land.ownerName = player.name;
            
            io.to(roomId).emit('update-players', room.players);
            io.to(roomId).emit('update-map', room.mapInfo);
            io.to(roomId).emit('game-log', `🏠 ${player.name}님이 ${land.name}을(를) 매입했습니다!`);
        }
    });
    socket.on('build-building', ({ index, cost }) => {
        const roomId = socket.roomId;
        const room = rooms[roomId];
        const player = room.players[socket.id];
        const land = room.mapInfo[index];
        
        if (player.position === index && land.owner === socket.id && player.money >= cost && land.buildingLevel < 3) {
            player.money -= cost;
            land.buildingLevel += 1;
            const bNames = ["", "별장", "빌라", "호텔"];
            io.to(roomId).emit('game-log', `🏢 ${player.name}님이 ${land.name}에 ${bNames[land.buildingLevel]}을 지었습니다.`);
            io.to(roomId).emit('update-map', room.mapInfo);
            io.to(roomId).emit('update-players', room.players);
        }
    });
    // [server.js] 텔레포트 요청 처리 추가
    socket.on('teleport-request', (targetIndex) => {
        const roomId = socket.roomId;
        const room = rooms[roomId];
        const player = room.players[socket.id];

        const activeId = room.playerOrder[room.currentTurnIndex];

        // 검증: 플레이어가 존재하고, 현재 자기 턴이며, 세계일주 칸에 있는지 확인
        if (player && socket.id === activeId && player.position === 8) {
            
            // 1. 상태 업데이트
            player.position = targetIndex;
            player.isTeleportPending = false; // 대기 상태 해제
            if (targetIndex >= 16 || targetIndex < 8) {
                player.money += 200;
                io.to(roomId).emit('game-log', `💰 ${player.name}님이 출발지를 통과하여 월급 200만원을 받았습니다!`);
            }

            // 2. 로그 알림
            const targetName = room.mapInfo[targetIndex].name;
            io.to(roomId).emit('game-log', `✈️ ${player.name}님이 세계일주를 통해 [${targetName}](으)로 이동했습니다!`);

            // 3. 이동 완료 후 로직(통행료, 구매 등) 수행
            // 주의: handleMoveComplete 내부에서 nextTurn()이 호출되므로 턴이 자동으로 넘어갑니다.
            handleMoveComplete(io, socket, targetIndex, room, roomId);
        }
    });

    socket.on('disconnect', () => {
        const roomId = socket.roomId;

        // 방이 존재하는지 먼저 확인
        if (roomId && rooms[roomId]) {
            const room = rooms[roomId];
            const player = room.players[socket.id];

            if (player) {
                const name = player.name;

                // 1. 부동산 회수
                room.mapInfo.forEach(tile => {
                    if (tile.owner === socket.id) {
                        tile.owner = null;
                        tile.ownerName = null;
                        tile.buildingLevel = 0;
                    }
                });

                // 2. 플레이어 데이터 제거
                delete room.players[socket.id];
                room.playerOrder = room.playerOrder.filter(id => id !== socket.id);

                // 3. 방 삭제 또는 업데이트
                if (room.playerOrder.length === 0) {
                    console.log(`[${roomId}] 모든 인원 퇴장. 방 삭제`);
                    delete rooms[roomId];
                } else {
                    // 턴 인덱스 보정
                    if (room.currentTurnIndex >= room.playerOrder.length) {
                        room.currentTurnIndex = 0;
                    }

                    // 🚨 [핵심 수정] update-game 대신 명확한 하위 데이터만 전송
                    // 순환 참조 위험이 있는 room 객체 전체를 보내지 않습니다.
                    io.to(roomId).emit('update-map', room.mapInfo);
                    io.to(roomId).emit('update-players', room.players);
                    io.to(roomId).emit('turn-change', room.playerOrder[room.currentTurnIndex]);
                    io.to(roomId).emit('update-taxpool', room.taxPool);
                    
                    io.to(roomId).emit('game-log', `📢 ${name}님이 퇴장하여 소유했던 땅들이 초기화되었습니다.`);
                    console.log(`[${roomId}] ${name} 퇴장 처리 완료`);
                }
            }
        }
        if (socket.username) {
            delete activeUsers[socket.username];
        }
    });

    socket.on('request-room-list', () => {
        // 현재 서버에 있는 rooms 정보를 읽어 목록 전송
        socket.emit('room-list', getPublicRooms(rooms));
        console.log(`[Lobby] ${socket.id}님이 방 목록을 새로고침했습니다.`);
    });

//========================================================================================function========================================================================================

    function nextTurn(io, room, roomId) {
        room.currentTurnIndex = (room.currentTurnIndex + 1) % room.playerOrder.length;
        io.to(roomId).emit('turn-change', room.playerOrder[room.currentTurnIndex]);
        io.to(roomId).emit('update-players', room.players);
    }

    function handleMoveComplete(io, socket, finalPos, room, roomId) {
        const player = room.players[socket.id];
        const land = room.mapInfo[finalPos];
        player.position = finalPos;

        // 1. 통행료 지불
        if (land.type === 'land' && land.owner && land.owner !== socket.id) {
            const owner = room.players[land.owner];
            const baseFee = Math.floor(land.price * 0.4);
            const fee = baseFee * [1, 2, 4, 6][land.buildingLevel];
            // const fee = 1000; //테스트용 고정값

            if (player.money >= fee && player.freePass > 0) {
                player.freePass -= 1;
                io.to(roomId).emit('showModalHandler-freePass', {
                    title: "🎫 통행료 면제권 사용",
                    message: `${player.name}님의 통행료 ${fee}만원을 면제합니다!`,
                });
            } else if (player.money >= fee) {
                player.money -= fee;
                owner.money += fee;
                socket.emit('showModalHandler-payFee', {
                    title: "🧾 도시 통행료 청구서",
                    isPayfee: true,
                    details: {
                        owner: owner.name,
                        city: land.name,
                        baseFee: baseFee,
                        building: land.buildingLevel === 0 ? "건물 없음" : ["별장", "빌라", "호텔"][land.buildingLevel - 1],
                        multiplier: [1, 2, 4, 6][land.buildingLevel],
                        total: `${fee}만원`
                    }
                });
                socket.to(land.owner).emit('showModalHandler-notify-income', {
                    title: "💰 입금 확인서",
                    isPayfee: true,
                    details: {
                        owner: owner.name,
                        baseFee: baseFee,
                        total: `${fee}만원`,
                        multiplier: [1, 2, 4, 6][land.buildingLevel],
                        building: land.buildingLevel === 0 ? "건물 없음" : ["별장", "빌라", "호텔"][land.buildingLevel - 1],
                        landName: land.name,
                        payerName: player.name
                    }
                });
                io.to(roomId).emit('game-log', `💸 ${player.name} -> ${owner.name} 통행료 ${fee}만원 지불`);
            } else {
                socket.emit('showModalHandler-payFee', {
                    title: "🧾 도시 통행료 청구서",
                    isPayfee: true,
                    details: {
                        owner: owner.name,
                        city: land.name,
                        baseFee: baseFee,
                        building: land.buildingLevel === 0 ? "건물 없음" : ["별장", "빌라", "호텔"][land.buildingLevel - 1],
                        multiplier: [1, 2, 4, 6][land.buildingLevel],
                        total: `${player.money}만원(파산)`
                    }
                });
                socket.to(land.owner).emit('showModalHandler-notify-income', {
                    title: "💰 입금 확인서",
                    isPayfee: true,
                    details: {
                        owner: owner.name,
                        baseFee: baseFee,
                        total: `${player.money}만원(파산)`,
                        multiplier: [1, 2, 4, 6][land.buildingLevel],
                        building: land.buildingLevel === 0 ? "건물 없음" : ["별장", "빌라", "호텔"][land.buildingLevel - 1],
                        landName: land.name,
                        payerName: `${player.name}(파산)`
                    }
                });
                owner.money += player.money;
                player.money = 0;
                handleBankruptcy(io, socket.id, room, roomId);
                return; // 파산 시 턴 교대 로직은 handleBankruptcy에서 처리
            }
        } 
        // 2. 땅 구매/건축 제안
        else if (land.type === 'land') {
            if (!land.owner && player.money >= land.price) {
                socket.emit('ask-buy-land', { index: finalPos, name: land.name, price: land.price });
            } else if (land.owner === socket.id) {
                const standardCost = land.price * 0.3;
                const costs = [standardCost, land.price + standardCost / 6, standardCost * 2];
                const names = ["별장", "빌라", "호텔"];
                if (land.buildingLevel < 3) {
                    socket.emit('ask-build-building', { 
                        name: land.name, 
                        buildingName: names[land.buildingLevel], 
                        cost: Math.floor(costs[land.buildingLevel]), 
                        index: finalPos 
                    });
                }
            }
        }
        // 3. 특수 칸 처리 (무인도, 사회복지, 국세청 등)
        else {
            return processSpecialTile(io, player, finalPos, room, roomId);
        }

        io.to(roomId).emit('update-players', room.players);
        io.to(roomId).emit('update-taxpool', room.taxPool);
        nextTurn(io, room, roomId);
    }

    function processSpecialTile(io, player, pos, room, roomId) {
        if (pos === 24) {
            if (player.lockedTurnsPass > 0) {
                player.lockedTurnsPass -= 1;
                io.to(roomId).emit('game-log', `🏝️ ${player.name}님이 무인도 탈출권을 사용하여 탈출했습니다.`);
                return;
            }
            else {
                player.lockedTurns = 3;
                io.to(roomId).emit('game-log', `🚨 ${player.name}님 무인도 도착!`);
            }
        } else if (pos === 0) {
            player.money += room.taxPool;
            io.to(roomId).emit('game-log', `🎉 ${player.name}님 기금 ${room.taxPool}만원 수령!`);
            room.taxPool = 0;
        }
        else if (pos === 8) {
                player.isTeleportPending = true; // 세계일주 대기 상태 설정
                io.to(roomId).emit('game-log', `✈️ ${player.name}님이 세계일주 칸에 도착했습니다!`);
        }
        else if (pos === 4 || pos === 20 || pos === 29) {
                const randomIndex = Math.floor(Math.random() * ChanceCards.length);
                const card = ChanceCards[randomIndex];
                // const card = ChanceCards[6]; // 테스트용 고정 카드

                card.action(player);
                io.to(roomId).emit('game-log', `${player.name}님이 찬스 칸에 도착했습니다!`);

                io.to(roomId).emit('showModalHandler-chance-card', {
                    title: card.title,
                    description: card.description,
                    name: player.name
                });

                // 2. 만약 카드로 인해 위치가 변경되었다면 (예: 세계일주, 이사 등)
                // 서버 내부 함수를 직접 호출하여 도착지 로직을 수행합니다.
                if (card.positionChange) {
                    io.to(roomId).emit('update-players', room.players);
                    handleMoveComplete(io, socket, player.position, room, roomId);
                    
                    // handleMoveComplete 내부에서 nextTurn을 호출하므로 여기서 중단
                    return; 
                }

        }
        else if (pos === 10) {
            const tax = 100;
            const actualTax = Math.min(player.money, tax);
            player.money -= actualTax;
            room.taxPool += actualTax * 0.7;
            io.to(roomId).emit('game-log', `💸 ${player.name}님 세금 ${actualTax * 0.7}(기금 70% / 세금 30%)만원 납부`);
        }
        io.to(roomId).emit('update-players', room.players);
        io.to(roomId).emit('update-taxpool', room.taxPool);
        nextTurn(io, room, roomId);
    }
    function handleBankruptcy(io, socketId, room, roomId) {
    const player = room.players[socketId];
    io.to(roomId).emit('game-log', `📢 ${player.name}님이 파산하였습니다!`);
    
    io.to(socketId).emit('player-bankrupt', socketId);

    // 땅 회수
    room.mapInfo.forEach(tile => {
        if (tile.owner === socketId) {
            tile.owner = null;
            tile.ownerName = null;
            tile.buildingLevel = 0;
        }
    });

    delete room.players[socketId];
    room.playerOrder = room.playerOrder.filter(id => id !== socketId);
    
    if (room.playerOrder.length <= 1) {
        const winner = room.players[room.playerOrder[0]];
        io.to(roomId).emit('game-log', `🏆 최종 승리: ${winner ? winner.name : '없음'}`);
        io.to(room.playerOrder[0]).emit('player-winner', room.playerOrder[0]);

        // 2초 뒤에 게임 리셋
        setTimeout(() => {
            console.log(`[${roomId}] 모든 인원 퇴장. 방 삭제`);
            
            // 모든 클라이언트에 초기화된 상태 방송
            io.to(roomId).emit('update-map', room.mapInfo);
            io.to(roomId).emit('update-players', room.players);
            io.to(roomId).emit('update-taxpool', room.taxPool);
            io.to(roomId).emit('turn-change', null);
            delete rooms[roomId];
        }, 2000);
    } else {
        nextTurn(io, room, roomId);
    }
}
}


