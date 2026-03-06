export const Renderer = {
    renderAll(state) {
        const { ctx, canvas, mapData, currentMap, players, diceAnim, TILE_W, TILE_H, currentTaxPool, isTeleporting } = state;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.imageSmoothingEnabled = true;

        // 1. 모든 타일 그리기 | [핵심] 그리기 순서 정렬 (Painter's Algorithm)
        // Y좌표가 낮은(뒤에 있는) 타일을 먼저 그리고, Y가 높은(앞에 있는) 타일을 나중에 그립니다.
        const sortedIndices = [...mapData.keys()].sort((a, b) => {
            return mapData[a].y - mapData[b].y;
        });

        // 2. 정렬된 순서대로 타일 그리기
        sortedIndices.forEach(index => {
            const tile = mapData[index];
            const info = currentMap[index] || { name: "...", price: 0 };
            this.drawMahjongTile(tile, info, index, state);
        });

        // 2. 플레이어 말 그리기 (중복된 칸일 때 위치 오프셋 및 점프 애니메이션 적용)
        Object.keys(players).forEach(id => {
            const p = players[id];
            const pos = mapData[p.position];
            if (!pos) return;

            // 애니메이션 중이면 애니메이션 포지션 사용
            let centerX, centerY;
            if (p.animX !== undefined && p.animY !== undefined) {
                centerX = p.animX + TILE_W / 2;
                centerY = p.animY + TILE_H / 2;
            } else {
                centerX = pos.x + TILE_W / 2;
                centerY = pos.y + TILE_H / 2;
            }
            
            // 동일 칸에 있는 플레이어 목록을 구하고, 각자의 인덱스를 찾음
            const playersHere = Object.values(players).filter(pl => pl.position === p.position);
            const idx = playersHere.findIndex(pl => pl.id === id || pl === p);
            // 오프셋 거리 (플레이어 크기의 절반 정도)
            const offsetStep = Math.min(TILE_W, TILE_H) * 0.25;
            const offsetX = (idx - (playersHere.length - 1) / 2) * offsetStep;
            // y-offset은 조금 더 작게 해서 위아래로 추가 분산
            const offsetStepY = offsetStep * 0.4;
            const offsetY = (idx - (playersHere.length - 1) / 2) * offsetStepY;

            // 캐릭터 크기 기준값 (기존 pieceRadius와 유사한 스케일)
            const scale = Math.min(TILE_W, TILE_H) * 0.5;

            // 점프 오프셋 추가
            const jumpOffset = p.animOffset || 0;
            ctx.save();
            ctx.translate(centerX + offsetX, centerY - scale + offsetY - jumpOffset); // 위치에 오프셋을 추가
            ctx.globalAlpha = p.lockedTurns > 0 ? 0.5 : 1.0;

            // 1. 그림자 효과
            
            
            // 2. 진저브레드 [용감한맛 쿠키] 몸체 그리기 시작
            ctx.strokeStyle = p.color; // 플레이어 고유 색상
            ctx.fillStyle = p.color;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(0,0,0,0.9)";

            // --- 팔 (선으로 연결된 진저브레드 스타일) ---
            ctx.lineWidth = scale * 0.3;
            
            // 왼팔
            ctx.beginPath();
            ctx.moveTo(-scale * 0.25, -scale * 0.1);
            ctx.lineTo(-scale * 0.55, -scale * 0.05);
            ctx.stroke();
            // 왼손 (팔 끝의 둥근 원)
            ctx.beginPath();
            ctx.arc(-scale * 0.55, -scale * 0.05, scale * 0.1, 0, Math.PI * 2);
            ctx.fill();
            
            // 오른팔
            ctx.beginPath();
            ctx.moveTo(scale * 0.25, -scale * 0.1);
            ctx.lineTo(scale * 0.55, -scale * 0.05);
            ctx.stroke();
            // 오른손 (팔 끝의 둥근 원)
            ctx.beginPath();
            ctx.arc(scale * 0.55, -scale * 0.05, scale * 0.1, 0, Math.PI * 2);
            ctx.fill();

            // --- 다리 (선으로 연결된 진저브레드 스타일) ---
            // 왼다리
            const legheight = scale * 0.6
            ctx.beginPath();
            ctx.moveTo(-scale * 0.18, scale * 0.25);
            ctx.lineTo(-scale * 0.25, legheight);
            ctx.stroke();
            // 왼발 (다리 끝의 둥근 원)
            ctx.beginPath();
            ctx.arc(-scale * 0.25, legheight, scale * 0.12, 0, Math.PI * 2);
            ctx.fill();
            
            // 오른다리
            ctx.beginPath();
            ctx.moveTo(scale * 0.18, scale * 0.25);
            ctx.lineTo(scale * 0.25, legheight);
            ctx.stroke();
            // 오른발 (다리 끝의 둥근 원)
            ctx.beginPath();
            ctx.arc(scale * 0.25, legheight, scale * 0.12, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            // --- 몸통 및 머리 ---
            // 큰 몸통 (쿠키의 메인 몸체)
            ctx.beginPath();
            ctx.arc(0, 0, scale * 0.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 6;
            // 머리 (몸통 위에 맞붙음)
            ctx.beginPath();
            ctx.arc(0, -scale * 0.45, scale * 0.38, 0, Math.PI * 2);
            ctx.fill();


            // --- 표정: 눈과 눈썹 (화난 표정) ---
            ctx.shadowBlur = 0; // 장식엔 그림자 제거
            ctx.strokeStyle = "#000";
            ctx.lineWidth = scale * 0.06;
            ctx.lineCap = "round";
            
            // 왼쪽 눈 (/)
            ctx.beginPath();
            ctx.moveTo(-scale * 0.1, -scale * 0.50);
            ctx.lineTo(-scale * 0.15, -scale * 0.55); // 각도를 낮춤 (덜 수직)
            ctx.stroke();
            
            // 오른쪽 눈 (\)
            ctx.beginPath();
            ctx.moveTo(scale * 0.15, -scale * 0.55); // 각도를 낮춤 (덜 수직)
            ctx.lineTo(scale * 0.1, -scale * 0.50);
            ctx.stroke();

            // 입 (아래로 향하는 반원, 끝점들을 선으로 이어 닫힌 형태)
            ctx.strokeStyle = "#000";
            ctx.lineWidth = scale * 0.05;
            ctx.beginPath();
            // 아래로 향하는 반원으로 설정 (원래의 웃는 모양)
            ctx.arc(0, -scale * 0.36, scale * 0.2, 0, Math.PI, false);
            // 끝점들 사이를 직선으로 이어 닫힌 형태로 만듦
            ctx.closePath();
            ctx.stroke();

            ctx.restore();

            // 4. 닉네임 표시 (위치만 살짝 조정)
            ctx.fillStyle = "#000";
            const displayName = p.lockedTurns > 0 ? `🏝️ ${p.name}` : p.name;
            ctx.font = `bold ${Math.floor(scale * 0.6)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(displayName, centerX, centerY - (scale * 2));
            
            ctx.globalAlpha = 1.0;

            // 주사위 애니메이션이 활성 상태일 때만 중앙에 그림
            if (diceAnim.showResult) {
                const dpr = window.devicePixelRatio || 1;
                const centerX = (canvas.width / dpr) / 2;
                const centerY = (canvas.height / dpr) / 2 - 30;
                
                // 주사위 그림자 (바닥에 고정)
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.beginPath();
                ctx.ellipse(centerX, centerY + 20, 30 + (diceAnim.yOffset * 0.1), 15, 0, 0, Math.PI * 2);
                ctx.fill();

                // 3D 주사위 본체
                this.draw3DDice(ctx, centerX, centerY, 45, diceAnim.value, diceAnim.rotation, diceAnim.yOffset);
            }
        });
    },
    drawMahjongTile(tile, info, index, state) {
        const { ctx, TILE_W, TILE_H, players, currentTaxPool, isTeleporting, images } = state;
        const chanceTileColor = "#f39c12";
        const chanceTileSideColor = "#c57f0e";

        const islandTileColor = "#0ff15a";
        const islandTileSideColor = "#0ba13d";

        const airplaneTileColor = "#3498db";
        const airplaneTileSideColor = "#246d9e";

        const wellTileColor = "#9b59b6";
        const wellTileSideColor = "#5a3369";

        const taxPoolTileColor = "#e62f22";
        const taxPoolTileSideColor = "#9b1f16";



        const blockTopColor = "#F2F2F2" //#FEECEB
        const blockTopLineColor = "#D0D3D8" //#B2A3B0
        const blockSideColor = "#AAB6BE" //#DAC6CC
        const blockSideLineColor = "#839AA1" //#888294
        const tileNameFontSize = 0.27; // 타일 이름 글꼴 크기 (타일 높이 대비 비율)
        
        const x = tile.x;
        const y = tile.y;
        const w = TILE_W;
        const h = TILE_H;
        const depth = 20; // 블록의 두께 (입체감)
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        
        // 1.5. 타일 아래 그림자 (우측상단에서 빛이 들어온다고 가정 - 상판과 동일한 마름모 형태)
        // shadowOffsetX/Y를 통해 수평/수직 이동을 조절할 수 있음
        
        // const shadowOffsetX = -21; // *이건 맵이 바닥에 붙어있는 느낌을 주는 그림자
        // const shadowOffsetY = 30; // *이건 맵이 바닥에 붙어있는 느낌을 주는 그림자

        const shadowOffsetX = 0;   // 그림자 가로 이동
        const shadowOffsetY = 70;  // 그림자 세로 이동 (깊이)
        const shadowColor = "rgba(0, 0, 0, 0.15)"; // 반투명 검은색
        ctx.fillStyle = shadowColor;
        ctx.beginPath();
        // 상단 마름모 좌표에서 X/Y 각각 오프셋 추가
        ctx.moveTo(centerX + shadowOffsetX, y + shadowOffsetY);             // 위점
        ctx.lineTo(x + w + shadowOffsetX, centerY + shadowOffsetY);         // 오른쪽
        ctx.lineTo(centerX + shadowOffsetX, y + h + shadowOffsetY);         // 아래점
        ctx.lineTo(x + shadowOffsetX, centerY + shadowOffsetY);             // 왼쪽
        ctx.closePath();
        ctx.fill();

        // 1. 블록 옆면 (입체 두께) - 먼저 그려야 상판에 가려짐
        if (index === 4 || index === 20 || index === 29) { // 찬스카드 칸은 특별한 색상
            ctx.fillStyle = chanceTileSideColor;
        }
        else if (index === 24) { // 무인도 칸은 특별한 색상
            ctx.fillStyle = islandTileSideColor;
        }
        else if (index === 0) { // 웰 칸은 특별한 색상
            ctx.fillStyle = wellTileSideColor;
        }
        else if (index === 8) { // 세계일주 칸은 특별한 색상   
            ctx.fillStyle = airplaneTileSideColor;
        }
        else if (index === 10) { // 세금 칸은 특별한 색상
            ctx.fillStyle = taxPoolTileSideColor;
        }
        else {
            ctx.fillStyle = blockSideColor; // 블록 옆면 색상 #bdc3c7
        };
        ctx.beginPath();
        ctx.moveTo(x, centerY); // 왼쪽 끝
        ctx.lineTo(x, centerY + depth); 
        ctx.lineTo(centerX, y + h + depth); // 아래 끝
        ctx.lineTo(x + w, centerY + depth); // 오른쪽 끝
        ctx.lineTo(x + w, centerY);
        ctx.lineTo(centerX, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = blockSideLineColor; //#95a5a6
        ctx.stroke();

        // 2. 블록 윗면 (마름모 상판)
        // 소유자가 있으면 해당 유저 색상, 없으면 흰색 계열
        if (info.owner && players[info.owner]) {
            ctx.fillStyle = players[info.owner].color;
        }
        else if (index === 4 || index === 20 || index === 29) { // 찬스카드 칸은 특별한 색상
            ctx.fillStyle = chanceTileColor;
        }
        else if (index === 24) { // 무인도 칸은 특별한 색상
            ctx.fillStyle = islandTileColor;
        }
        else if (index === 0) { // 웰 칸은 특별한 색상
            ctx.fillStyle = wellTileColor;
        }
        else if (index === 8) { // 세계일주 칸은 특별한 색상   
            ctx.fillStyle = airplaneTileColor;
        }
        else if (index === 10) { // 세금 칸은 특별한 색상
            ctx.fillStyle = taxPoolTileColor;
        }
        else {
            ctx.fillStyle = blockTopColor;
        }

        ctx.beginPath();
        ctx.moveTo(centerX, y);          // 위
        ctx.lineTo(x + w, centerY);      // 오른쪽
        ctx.lineTo(centerX, y + h);      // 아래
        ctx.lineTo(x, centerY);          // 왼쪽
        ctx.closePath();
        ctx.fill();
        
        // 상판 테두리
        ctx.strokeStyle = blockTopLineColor; //#333
        ctx.lineWidth = 1.5;
        ctx.stroke();

        
        // buildingLevel: 0 none, 1 별장, 2 빌라, 3 호텔
        // 3. 건물 표시 (Isometric 형태 - 타일 등각투영 축에 맞춰 배치)
            if (info.buildingLevel && info.buildingLevel > 0) {
                const n = Math.min(info.buildingLevel, 3);
                const buildingW = TILE_W * 0.28;
                const buildingH = TILE_H * 0.18;
                const buildingDepth = buildingH * 1;

                // 타일 내부에서 건물 그룹을 조금 이동시키고 싶을 때 사용할 오프셋
                // 좌측하단으로 이동하려면 X는 음수, Y는 양수 방향을 주면 됩니다.
                // 여기에서는 좌하단으로 살짝 이동시키는 예를 넣어둠.
                const buildingShiftX = TILE_W * 0.1; // 타일 너비의 10% 만큼 왼쪽으로
                const buildingShiftY = TILE_H * 0.2;  // 타일 높이의 5% 만큼 아래로

                // 타일의 상단(마름모 위점)을 기준점으로 사용
                // topX/topY에 각각 오프셋을 주어 건물 묶음의 시작점을 조절할 수 있습니다.
                const topX = centerX + buildingShiftX;            // 위점 X에 shift 적용
                const topY = y + TILE_H * 0.15 + buildingShiftY; // 위점 Y에 shift 적용

                // 등각 축 방향 벡터 (top -> right)
                const rightVx = (x + w) - topX; // 보통 w/2
                const rightVy = centerY - topY; // 보통 h/2 - small
                const dirLen = Math.hypot(rightVx, rightVy) || 1;
                const ux = rightVx / dirLen;
                const uy = rightVy / dirLen;

                // 화면상의 수평 거리(buildingW)만큼 이동시키기 위한 dx,dy 계산
                // dx를 buildingW * factor로 증가시키고, 그에 따른 y이동을 uy/ux 비율로 보정

                // 겹치기 비율: 0.0(붙음) ~ 0.5(절반 겹침)
                const overlap = n > 1 ? 0.3 : 0;
                for (let i = 0; i < n; i++) {
                    const factor = i - (n - 1) / 2; // -1,0,1 for n=3 etc.
                    const dx = buildingW * factor * (1 - overlap);
                    const bx = topX + dx;
                    // 타일 상단-우측 선에 bx 위치 계산 후 그에 상응하는 y 얻기
                    const rightX = x + w;
                    const rightY = centerY;
                    let by;
                    if (rightX !== topX) {
                        const t = (bx - topX) / (rightX - topX);
                        by = topY + t * (rightY - topY);
                    } else {
                        by = topY;
                    }

                    // 색상 결정
                    let buildingColor, buildingDarkColor;
                    if (i === 0) { // 별장
                        buildingColor = "#f5e6d3";
                        buildingDarkColor = "#d4b896";
                    } else if (i === 1) { // 빌라
                        buildingColor = "#c4b3a4";
                        buildingDarkColor = "#b8a08a";
                    } else { // 호텔
                        buildingColor = "#ffd700";
                        buildingDarkColor = "#daa520";
                    }

                    // 옆면(어두운 면)
                    ctx.fillStyle = buildingDarkColor;
                    ctx.beginPath();
                    ctx.moveTo(bx - buildingW / 2, by);
                    ctx.lineTo(bx - buildingW / 2, by - buildingDepth);
                    ctx.lineTo(bx, by - buildingDepth - buildingH / 2);
                    ctx.lineTo(bx + buildingW / 2, by - buildingDepth);
                    ctx.lineTo(bx + buildingW / 2, by);
                    ctx.lineTo(bx, by + buildingH / 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = "#666";
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // 지붕(마름모)
                    ctx.fillStyle = buildingColor;
                    ctx.beginPath();
                    ctx.moveTo(bx, by - buildingDepth - buildingH / 2);
                    ctx.lineTo(bx + buildingW / 2, by - buildingDepth);
                    ctx.lineTo(bx, by + buildingH / 2);
                    ctx.lineTo(bx - buildingW / 2, by - buildingDepth);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = "#333";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }
            //이미지를 건물로 추가 로직 (기존의 간단한 도형 대신 단계별 이미지로 표현) 이미지 넣으면 위 로직이랑 바꾸기
            // if (info.buildingLevel && info.buildingLevel > 0) {
            //     const n = Math.min(info.buildingLevel, 3);
            //     const imgW = TILE_W * 0.45; // 타일 크기에 맞게 조절
            //     const imgH = imgW; 

            //     // 배치 기준점 (타일 중앙 상단)
            //     const topX = tile.x + TILE_W / 2;
            //     const topY = tile.y + TILE_H * 0.25;

            //     for (let i = 0; i < n; i++) {
            //         const factor = i - (n - 1) / 2;
            //         const dx = (imgW * 0.5) * factor; // 건물 간 간격
            //         const bx = topX + dx;
            //         const by = topY + (dx * (TILE_H / TILE_W)); // Isometric 기울기 보정

            //         // state.images에서 단계별 이미지 선택
            //         let img;
            //         if (i === 0) img = images.villa;
            //         else if (i === 1) img = images.building;
            //         else img = images.hotel;

            //         // 이미지가 로드된 경우에만 그리기
            //         if (img.complete) {
            //             ctx.drawImage(img, bx - imgW / 2, by - imgH, imgW, imgH);
            //         }
            //     }
            // }
        // 3. 내부 텍스트 및 정보
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 세계일주(17), 무인도(6), 기금(11), 세금(18) 등 특수 아이콘/텍스트 처리
        let title = info.name;
        if (index === 16) title = "🚩 " + title; //출발지
        if (index === 24) title = "🏝️ " + title; // 무인도 
        if (index === 8) title = "✈️ " + title; // 세계여행
        if (index === 10) title = "💸 " + title; // 세금

        ctx.fillStyle = "#2c3e50";
        ctx.font = `bold ${Math.floor(TILE_H * tileNameFontSize)}px sans-serif`;
        ctx.fillText(title, centerX, centerY - TILE_H * 0.1);

        // 가격/소유주 표시
        if (info.type === "land" && !info.ownerName) {
            ctx.font = `${Math.floor(TILE_H * 0.23)}px sans-serif`;
            ctx.fillStyle = "#2980b9";
            ctx.fillText(`${info.price}만`, centerX, centerY + TILE_H * 0.15);
        } else if (info.ownerName) {
            ctx.font = `bold ${Math.floor(TILE_H * 0.23)}px sans-serif`;
            ctx.fillStyle = "#000000";
            ctx.fillText(`[${info.ownerName}]`, centerX, centerY + TILE_H * 0.15);
        }

        // 특수 정보 (기금/세금 액수)
        if (index === 0) {
            ctx.fillStyle = "#e67e22";
            ctx.font = `bold ${Math.floor(TILE_H * 0.26)}px sans-serif`;
            ctx.fillText(`${currentTaxPool}만`, centerX, centerY + TILE_H * 0.2);
        }
        if (index === 10) {
            ctx.fillStyle = "#f0dbd8";
            ctx.font = `bold ${Math.floor(TILE_H * 0.26)}px sans-serif`;
            ctx.fillText(`50만`, centerX, centerY + TILE_H * 0.2);
        }

        // 4. 세계일주 텔레포트 중일 때 강조 (노란 후광)
        if (isTeleporting) {
            ctx.strokeStyle = "rgba(241, 196, 15, 0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX, y - 5);
            ctx.lineTo(x + w + 5, centerY);
            ctx.lineTo(centerX, y + h + 5);
            ctx.lineTo(x - 5, centerY);
            ctx.closePath();
            ctx.stroke();
        }

    },
    draw3DDice(ctx, x, y, size, value, rotation, yOffset) {
        ctx.save();
        ctx.translate(x, y - yOffset);
        ctx.rotate(rotation);

        const s = size / 2;
        const skew = s * 0.5; // 입체 깊이감

        // 1. 상단 면 (Top Face) - 위로 솟아오른 모양
        ctx.fillStyle = "#ecf0f1"; // 가장 밝은 면
        ctx.beginPath();
        ctx.moveTo(-s, -s);
        ctx.lineTo(-s + skew, -s - skew); // 왼쪽 위로
        ctx.lineTo(s + skew, -s - skew);  // 오른쪽 위로
        ctx.lineTo(s, -s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. 우측 면 (Right Face) - 위쪽 대각선으로 연결
        ctx.fillStyle = "#bdc3c7"; // 중간 어두운 면
        ctx.beginPath();
        ctx.moveTo(s, -s);
        ctx.lineTo(s + skew, -s - skew); // 위쪽 대각선 방향으로 수정
        ctx.lineTo(s + skew, s - skew);  // 아래쪽도 평행하게 수정
        ctx.lineTo(s, s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. 정면 (Front Face) - 기준이 되는 면
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-s, -s, size, size);
        ctx.strokeRect(-s, -s, size, size);

        // 4. 주사위 눈 (Front Face에만 그림)
        ctx.fillStyle = value === 1 ? "#e74c3c" : "#2c3e50";
        const dotR = size * 0.1;
        const drawDot = (dx, dy) => {
            ctx.beginPath();
            ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
            ctx.fill();
        };

        if (value % 2 === 1) drawDot(0, 0);
        if (value > 1) { drawDot(-s/2, -s/2); drawDot(s/2, s/2); }
        if (value > 3) { drawDot(s/2, -s/2); drawDot(-s/2, s/2); }
        if (value === 6) { drawDot(-s/2, 0); drawDot(s/2, 0); }

        ctx.restore();
    },

    updateMapData(state) {
        const { mapData, canvas, COL_COUNT, TILE_W, TILE_H } = state;
        mapData.length = 0;
        
        const dpr = window.devicePixelRatio || 1;
        const centerX = (canvas.width / dpr) / 2;
        const centerY = (canvas.height / dpr) / 2;

        // 1. 맵 전체의 가로/세로 크기 계산
        // 다이아몬드 형태이므로 전체 가로 폭은 (한 변의 칸 수 - 1) * TILE_W 입니다.
        const totalMapWidth = (COL_COUNT - 1) * TILE_W;
        const totalMapHeight = (COL_COUNT - 1) * TILE_H;

        // 2. 시작점 재계산 (전체 폭의 절반만큼 왼쪽으로 이동)
        // centerX에서 가로 폭의 절반을 빼지 않고, 
        // 다이아몬드 꼭짓점 기준 좌표계로 다시 잡습니다.
        const startX = centerX; 
        const startY = centerY - (totalMapHeight / 2) - 9; //세로 위치조정 상수 +는 내림 -는 올림

        const stepX = TILE_W / 2;
        const stepY = TILE_H / 2;

        // --- 타일 배치 로직 ---
        
        // 1. 상단 -> 우측
        for (let i = 0; i < COL_COUNT - 1; i++) {
            mapData.push({ 
                x: startX + (i * stepX) - (TILE_W / 2), // TILE_W/2를 빼서 타일 자체가 중앙에 오도록 함
                y: startY + (i * stepY) 
            });
        }
        // 2. 우측 -> 하단
        for (let i = 0; i < COL_COUNT - 1; i++) {
            mapData.push({ 
                x: startX + ((COL_COUNT - 1) * stepX) - (i * stepX) - (TILE_W / 2), 
                y: startY + ((COL_COUNT - 1) * stepY) + (i * stepY) 
            });
        }
        // 3. 하단 -> 좌측
        for (let i = 0; i < COL_COUNT - 1; i++) {
            mapData.push({ 
                x: startX - (i * stepX) - (TILE_W / 2), 
                y: startY + (totalMapHeight) - (i * stepY) 
            });
        }
        // 4. 좌측 -> 상단
        for (let i = 0; i < COL_COUNT - 1; i++) {
            mapData.push({ 
                x: startX - ((COL_COUNT - 1) * stepX) + (i * stepX) - (TILE_W / 2), 
                y: startY + ((COL_COUNT - 1) * stepY) - (i * stepY) 
            });
        }
    },
    resizeCanvas(state) {
        const { canvas, ctx } = state;
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = window.innerWidth + 50; //타일 크기 조정 상수
        const logicalHeight = window.innerHeight + 50;
    
        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;
        canvas.style.width = logicalWidth + 'px';
        canvas.style.height = logicalHeight + 'px';
        ctx.scale(dpr, dpr);
    
        // 정사각형 다이아몬드 배치를 위해 타일 크기 최적화
        // 전체 맵 너비가 화면 너비의 90% 정도 차지하도록 설정
        state.TILE_W = (logicalWidth * 0.7) / (state.COL_COUNT - 1);
        state.TILE_H = state.TILE_W * 0.45; // 3D 느낌을 위해 가로세로 비율 조정 (0.5~0.6 추천)
    
        this.updateMapData(state);
        this.renderAll(state);
    },
}