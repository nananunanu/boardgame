// soundManager.js (또는 game.js 상단)
const sounds = {
    // 버튼 클릭 (짧고 통통 튀는 소리)
    button: new Audio('../sounds/button-tap.wav'),
    // 주사위 굴리기 (드르륵 소리)
    dice: new Audio('assets/sounds/dice-roll.mp3'),
    // 캐릭터 이동 (뾰뿅! 하는 귀여운 소리)
    move: new Audio('assets/sounds/jump.mp3'),
    // 돈 받을 때 (차링~ 소리)
    money: new Audio('assets/sounds/coin.mp3'),
    // 랜드마크 건설 (빠밤! 소리)
    build: new Audio('assets/sounds/build.mp3')
};

// 사운드 재생 함수 (중복 재생 가능하도록 설정)
export const playSound = (name) => {
    const sound = sounds[name];
    if (sound) {
        sound.currentTime = 0; // 재생 위치 초기화 (연속 클릭 시 끊김 방지)
        sound.play().catch(e => console.log("사운드 재생 실패 (사용자 상호작용 필요):", e));
    }
}