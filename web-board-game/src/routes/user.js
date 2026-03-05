// routes/user.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database'); // 방금 만든 db 가져오기

// 회원가입: /api/user/register 로 들어오게 됨
router.post('/register', async (req, res) => {
    const { nickname, username, password } = req.body; // nickname 추가됨
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 쿼리에 nickname 추가
        db.run(`INSERT INTO users (username, nickname, password) VALUES (?, ?, ?)`, 
            [username, nickname, hashedPassword], function(err) {
            if (err) {
                console.error(err);
                return res.status(400).send('아이디 중복 또는 가입 오류');
            }
            res.status(201).send('가입 성공');
        });
    } catch (e) { res.status(500).send('서버 오류'); }
});

// 로그인: /api/user/login 으로 들어오게 됨
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user) return res.status(400).send('유저를 찾을 수 없음');
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).send('비밀번호 불일치');
        
        res.json({ 
            id: user.id, 
            username: user.username, 
            nickname: user.nickname, // 추가!
            money: user.game_money 
        });
    });
});

module.exports = router;