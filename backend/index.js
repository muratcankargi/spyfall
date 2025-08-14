const http = require('http');
const { Server } = require('socket.io');

const express = require('express');
const bodyParser = require('body-parser');
const models = require('./models');
const port = 5001;
const roomUsers = {};

const cors = require('cors');

const app = express();
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(bodyParser.json());
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
}));

app.use(express.json());
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

app.get('/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.query; 

        const roomRes = await models.getRoomById(id);
        if (!roomRes) {
            return res.status(404).json({ message: 'Oda bulunamadı.' });
        }

        let isOwner = false;
        if (username) {
            const user = await models.getUserByUsername(username);
            if (user && roomRes.owner_id === user.id) {
                isOwner = true;
            }
        }

        res.json({
            ...roomRes,
            isOwner
        });
    } catch (err) {
        console.error('Hata /rooms/:id:', err);
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
        if (err.code === 'DUPLICATE_USERNAME') {
            return res.status(409).json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' });
        }
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

app.post('/create-room', async (req, res) => {
    try {
        const { username, type_id } = req.body;
        if (!username) {
            return res.status(400).json({ message: 'username zorunludur.' });
        }
        const result = await models.createRoomWithUser(username, type_id);
        res.status(201).json(result);
    } catch (err) {
        if (err.code === 'DUPLICATE_USERNAME') {
            return res.status(409).json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' });
        }
        console.error('Hata /create-room:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

io.on("connection", (socket) => {

    socket.on("joinRoom", ({ roomId, username }) => {
        if (!roomId || !username) {
            console.warn("joinRoom eksik param:", { roomId, username, socket: socket.id });
            return;
        }

        socket.join(roomId);

        if (!roomUsers[roomId]) roomUsers[roomId] = [];

        if (!roomUsers[roomId].some(u => u.id === socket.id)) {
            const nameTaken = roomUsers[roomId].some(u => u.username === username);
            if (nameTaken) {
                socket.emit("joinError", { message: "Bu kullanıcı adı oda içinde zaten mevcut." });
                return;
            }

            roomUsers[roomId].push({ id: socket.id, username });
        }
        io.to(roomId).emit("updateUserList", roomUsers[roomId]);
    });

    socket.on("leaveRoom", ({ roomId, username }) => {
        if (!roomId) return;
        if (!roomUsers[roomId]) return;

        roomUsers[roomId] = roomUsers[roomId].filter(u => u.id !== socket.id && u.username !== username);
        io.to(roomId).emit("updateUserList", roomUsers[roomId]);
    });

    socket.on("disconnect", () => {
        for (const roomId in roomUsers) {
            const index = roomUsers[roomId].findIndex(u => u.id === socket.id);
            if (index !== -1) {
                roomUsers[roomId].splice(index, 1);
                io.to(roomId).emit("updateUserList", roomUsers[roomId]);
            }
        }
    });
});

app.get('/types', async (req, res) => {
    try {
        const types = await models.getAllTypes();
        res.json(types);
    } catch (err) {
        console.error('Hata /types GET:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

server.listen(port, () => {
    console.log(`API sunucusu çalışıyor: http://localhost:${port}`);
});