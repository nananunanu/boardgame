const { resetGame } = require('../utils/gameUtils');
const { ChanceCards } = require('../utils/chanceCards');
const Engine = require('../logic/gameEngine');

module.exports = (io, socket, gameState) => {
    const { players, mapInfo } = gameState;

    socket.on('move-complete', (finalPos) => {
        handleMoveComplete(io, socket, finalPos, gameState);
    });
    socket.on('join-game', (username) => {
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        players[socket.id] = {
            name: username,
            position: 0,
            color: color,
            money: 400,
            lockedTurns: 0,
        };
        gameState.playerOrder.push(socket.id);

        io.emit('update-players', players);
        io.emit('turn-change', gameState.playerOrder[gameState.currentTurnIndex]);
        io.emit('update-map', mapInfo);
        io.emit('game-log', `📢 ${username}님이 입장하셨습니다.`);
    });
    // 주사위 굴리기 요청 처리
    socket.on('roll-dice', () => {
        const activeId = gameState.playerOrder[gameState.currentTurnIndex];
        if (socket.id !== activeId || !players[activeId]) return;

        const player = players[activeId];
        
        // 무인도 체크
        if (player.lockedTurns > 0) {
            player.lockedTurns--;
            io.emit('game-log', `🏝️ ${player.name}님은 무인도에 갇혀 있습니다. (남은 턴: ${player.lockedTurns})`);
            nextTurn(io, gameState);
            return;
        }

        const diceValue = 21; // 테스트용 고정값
        // const diceValue = Math.floor(Math.random() * 6) + 1;
        const oldPos = player.position;
        const newPos = (oldPos + diceValue) % mapInfo.length;

        io.emit('dice-result', { playerId: socket.id, value: diceValue, name: player.name });

        // 월급 지급 (한 바퀴 완주)
        if (newPos < oldPos || (oldPos + diceValue >= mapInfo.length)) {
            player.money += 300;
            io.emit('game-log', `💰 ${player.name}님이 월급 300만원을 받았습니다!`);
        }
    });
    // 땅 구매 요청 처리
    socket.on('buy-land', (tileIndex) => {
        const land = mapInfo[tileIndex];
        const player = players[socket.id];
        if (land.type === 'land' && !land.owner && player.money >= land.price) {
            player.money -= land.price;
            land.owner = socket.id;
            land.ownerName = player.name;
            io.emit('update-players', players);
            io.emit('update-map', mapInfo);
        }
    });
    socket.on('build-building', ({ index, cost }) => {
        const land = mapInfo[index];
        const player = players[socket.id];
        if (player.position === index && land.owner === socket.id && player.money >= cost && land.buildingLevel < 3) {
            player.money -= cost;
            land.buildingLevel += 1;
            const bNames = ["", "별장", "빌라", "호텔"];
            io.emit('game-log', `🏢 ${player.name}님이 ${land.name}에 ${bNames[land.buildingLevel]}을 지었습니다.`);
            io.emit('update-map', mapInfo);
            io.emit('update-players', players);
        }
    });
    // [server.js] 텔레포트 요청 처리 추가
    socket.on('teleport-request', (targetIndex) => {
        const player = gameState.players[socket.id];
        const activeId = gameState.playerOrder[gameState.currentTurnIndex];

        // 검증: 플레이어가 존재하고, 현재 자기 턴이며, 세계일주(21번) 칸에 있는지 확인
        if (player && socket.id === activeId && player.position === 21) {
            
            // 1. 상태 업데이트
            player.position = targetIndex;
            player.isTeleportPending = false; // 대기 상태 해제

            // 2. 로그 알림
            const targetName = gameState.mapInfo[targetIndex].name;
            io.emit('game-log', `✈️ ${player.name}님이 세계일주를 통해 [${targetName}](으)로 이동했습니다!`);

            // 3. 이동 완료 후 로직(통행료, 구매 등) 수행
            // 주의: handleMoveComplete 내부에서 nextTurn()이 호출되므로 턴이 자동으로 넘어갑니다.
            handleMoveComplete(io, socket, targetIndex, gameState);
        }
    });

    socket.on('disconnect', () => {
    // players 대신 gameState.players 사용
    if (gameState.players[socket.id]) {
        const name = gameState.players[socket.id].name;
        
        // 1. 플레이어 데이터 제거
        delete gameState.players[socket.id];
        
        // 2. 플레이어 순서 배열에서 제거 (reassignment 방지 위해 직접 할당)
        gameState.playerOrder = gameState.playerOrder.filter(id => id !== socket.id);
        
        // 3. [에러 지점] 턴 인덱스 보정
        // currentTurnIndex 대신 gameState.currentTurnIndex 사용
        if (gameState.currentTurnIndex >= gameState.playerOrder.length) {
            gameState.currentTurnIndex = 0;
        }
        
        // 4. 업데이트 방송
        io.emit('update-players', gameState.players);
        io.emit('turn-change', gameState.playerOrder[gameState.currentTurnIndex]);
        
        console.log(`${name} 퇴장 (남은 인원: ${gameState.playerOrder.length}명)`);
    }
});
}

//========================================================================================function========================================================================================
function nextTurn(io, gameState) {
    gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.playerOrder.length;
    io.emit('turn-change', gameState.playerOrder[gameState.currentTurnIndex]);
    io.emit('update-players', gameState.players);
}

function handleMoveComplete(io, socket, finalPos, gameState) {
    const player = gameState.players[socket.id];
    const land = gameState.mapInfo[finalPos];
    player.position = finalPos;

    // 1. 통행료 지불
    if (land.type === 'land' && land.owner && land.owner !== socket.id) {
        const owner = gameState.players[land.owner];
        const baseFee = Math.floor(land.price * 0.4);
        const fee = baseFee * [1, 2, 4, 6][land.buildingLevel];

        if (player.money >= fee && player.freePass > 0) {
            player.freePass -= 1;
            io.emit('showModalHandler-freePass', {
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
            io.emit('game-log', `💸 ${player.name} -> ${owner.name} 통행료 ${fee}만원 지불`);
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
            handleBankruptcy(io, socket.id, gameState);
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
        processSpecialTile(io, player, finalPos, gameState);
    }

    io.emit('update-players', gameState.players);
    io.emit('update-taxpool', gameState.taxPool);
    nextTurn(io, gameState);
}

function processSpecialTile(io, player, pos, gameState) {
    if (pos === 7) {
        player.lockedTurns = 3;
        io.emit('game-log', `🚨 ${player.name}님 무인도 도착!`);
    } else if (pos === 14) {
        player.money += gameState.taxPool;
        io.emit('game-log', `🎉 ${player.name}님 기금 ${gameState.taxPool}만원 수령!`);
        gameState.taxPool = 0;
    }
    else if (pos === 21) {
            player.isTeleportPending = true; // 세계일주 대기 상태 설정
            io.emit('game-log', `✈️ ${player.name}님이 세계일주 칸에 도착했습니다!`);
    }
    else if (pos === 4 || pos === 18) {
            const randomIndex = Math.floor(Math.random() * ChanceCards.length);
            const card = ChanceCards[randomIndex];

            card.action(player);

            io.emit('game-log', `${player.name}님이 찬스 칸에 도착했습니다!`);

            io.emit('showModalHandler-chance-card', {
                title: card.title,
                description: card.description,
                name: player.name
            });
    }
    else if (pos === 23) {
        const tax = 50;
        const actualTax = Math.min(player.money, tax);
        player.money -= actualTax;
        gameState.taxPool += actualTax;
        io.emit('game-log', `💸 ${player.name}님 세금 ${actualTax}만원 납부`);
    }
}

function handleBankruptcy(io, socketId, gameState) {
    const player = gameState.players[socketId];
    io.emit('game-log', `📢 ${player.name}님이 파산하였습니다!`);
    
    // 땅 회수
    gameState.mapInfo.forEach(tile => {
        if (tile.owner === socketId) {
            tile.owner = null;
            tile.ownerName = null;
            tile.buildingLevel = 0;
        }
    });

    delete gameState.players[socketId];
    gameState.playerOrder = gameState.playerOrder.filter(id => id !== socketId);
    
    if (gameState.playerOrder.length <= 1) {
        const winner = gameState.players[gameState.playerOrder[0]];
        io.emit('game-log', `🏆 최종 승리: ${winner ? winner.name : '없음'}`);
        // 2초 뒤에 게임 리셋
        setTimeout(() => {
            resetGame(gameState); // 상태 초기화
            
            // 모든 클라이언트에 초기화된 상태 방송
            io.emit('update-map', gameState.mapInfo);
            io.emit('update-players', gameState.players);
            io.emit('update-taxpool', gameState.taxPool);
            io.emit('turn-change', null);
        }, 2000);
    } else {
        nextTurn(io, gameState);
    }
}