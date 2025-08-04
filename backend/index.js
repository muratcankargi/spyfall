const express = require('express');
const bodyParser = require('body-parser');
const models = require('./models');

const app = express();
const port = 5001;

app.use(bodyParser.json());

/* ---------- POST /types ---------- */
app.post('/types', async (req, res) => {
    try {
        const { title, type } = req.body;

        // Gelen `type` mutlaka dizi olmalı
        if (!title || !Array.isArray(type)) {
            return res.status(400).json({ message: 'title ve type (dizi) zorunludur.' });
        }

        const newType = await models.addType(title, type);
        res.status(201).json(newType);
    } catch (err) {
        console.error('Hata /types:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});


/* ---------- POST /rooms ---------- */
app.post('/rooms', async (req, res) => {
  try {
    const { type_id } = req.body;
    if (!type_id) {
      return res.status(400).json({ message: 'type_id zorunludur.' });
    }

    const newRoom = await models.addRoom(type_id);
    res.status(201).json(newRoom);
  } catch (err) {
    console.error('Hata /rooms:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});


/* ---------- POST /users ---------- */
app.post('/users', async (req, res) => {
    try {
        const { username, rooms_id } = req.body;
        if (!username || !rooms_id) {
            return res.status(400).json({ message: 'username ve rooms_id zorunludur.' });
        }
        const newUser = await models.addUser(username, rooms_id);
        res.status(201).json(newUser);
    } catch (err) {
        console.error('Hata /users:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

/* ---------- POST /games ---------- */
app.post('/games', async (req, res) => {
    try {
        const { spy_id, keyword } = req.body;
        if (!spy_id || !keyword) {
            return res.status(400).json({ message: 'spy_id ve keyword zorunludur.' });
        }
        const newGame = await models.addGame(spy_id, keyword);
        res.status(201).json(newGame);
    } catch (err) {
        console.error('Hata /games:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

app.listen(port, () => {
    console.log(`API sunucusu çalışıyor: http://localhost:${port}`);
});
