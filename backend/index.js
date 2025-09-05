const http = require('http');
const { Server } = require('socket.io');
require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const models = require('./models');
const cors = require('cors');

const roomUsers = {};

const port = process.env.PORT;
const cors_url = process.env.CORS_URL;
const cors_url_2 = process.env.CORS_URL_2;
const cors_url_3 = process.env.CORS_URL_3;

const app = express();
app.use(cors({
    origin: [
        cors_url,
        cors_url_2,
        cors_url_3
    ],
    methods: ["GET", "POST"]
}));
app.use(bodyParser.json());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            cors_url,
            cors_url_2,
            cors_url_3
        ],
        methods: ["GET", "POST"]
    }
});

/* ---------- POST /types ---------- */
app.post('/types', async (req, res) => {
    try {
        const { title, type } = req.body;

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
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ message: 'username zorunludur.' });
        }
        const result = await models.createRoomWithUser(username);
        res.status(201).json(result);
    } catch (err) {
        if (err.code === 'DUPLICATE_USERNAME') {
            return res.status(409).json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' });
        }
        console.error('Hata /create-room:', err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});
const rooms = new Map();
const roomVotes = {};
const roomGameData = {};

io.on("connection", (socket) => {

    socket.on("joinRoom", async ({ roomId, username }) => {
        try {
            socket.join(roomId);

            const user = await models.getUserByUsername(username);
            if (!user) {
                socket.emit("joinError", { message: "Kullanıcı bulunamadı." });
                return;
            }

            if (!roomUsers[roomId]) roomUsers[roomId] = [];

            const nameTaken = roomUsers[roomId].some(
                (u) => u.username.toLowerCase().trim() === username.toLowerCase().trim()
            );
            if (nameTaken) {
                socket.emit("joinError", { message: "Bu kullanıcı adı odada mevcut." });
                return;
            }

            if (!roomId || !username) {
                socket.emit("joinError", { message: "Eksik parametre." });
                return;
            }

            const room = await models.getRoomById(roomId);
            if (!room) {
                socket.emit("joinError", { message: "Oda bulunamadı." });
                return;
            }

            let ownerUser = null;
            if (room.owner_id) {
                ownerUser = await models.getUserById(room.owner_id);
            }

            const isOwner =
                !!ownerUser &&
                ownerUser.username?.toLowerCase().trim() === username.toLowerCase().trim();

            socket.data.roomId = roomId;
            socket.data.username = username;

            if (!roomUsers[roomId].some((u) => u.id === socket.id)) {
                roomUsers[roomId].push({ id: socket.id, username, userId: user.id });
            }

            socket.emit("roomOwner", { isOwner, ownerName: ownerUser?.username || null });
            io.to(roomId).emit("updateUserList", roomUsers[roomId]);

            const types = await models.getAllTypes();
            socket.emit("typesData", types);

        } catch (err) {
            console.error("joinRoom hata:", err);
            socket.emit("joinError", { message: "Sunucu hatası." });
        }
    });

    socket.on("startGame", async ({ roomId, words }) => {
        try {
            const usersInRoom = roomUsers[roomId];
            if (!usersInRoom || usersInRoom.length === 0) return;

            const randomUser = usersInRoom[Math.floor(Math.random() * usersInRoom.length)];
            const randomKeyword = words[Math.floor(Math.random() * words.length)];
            let randomSpyKeyword = words[Math.floor(Math.random() * words.length)];
            while (randomKeyword === randomSpyKeyword) {
                randomSpyKeyword = words[Math.floor(Math.random() * words.length)];
            }

            await models.addGame(randomUser.userId, randomKeyword);
            const spy = await models.getUserById(randomUser.userId);

            roomGameData[roomId] = {
                spy_username: spy.username,
                keyword: randomKeyword,
                spy_keyword: randomSpyKeyword,
                words: words.map((w) => ({ name: w, selected: true }))
            };

            io.to(roomId).emit("gameStarted", roomGameData[roomId]);
        } catch (err) {
            console.error("startGame hatası:", err);
        }
    });

    socket.on("updateTypes", async ({ roomId, updated }) => {
        io.to(roomId).emit("updateTypes", { updated });
    });

    socket.on("leaveRoom", ({ roomId, username }) => {
        if (!roomId) return;
        if (!roomUsers[roomId]) return;

        roomUsers[roomId] = roomUsers[roomId].filter(u => u.id !== socket.id && u.username !== username);
        io.to(roomId).emit("updateUserList", roomUsers[roomId]);
    });

    socket.on("endGame", async ({ roomId }) => {
        try {
            const usersInRoom = roomUsers[roomId];
            if (!usersInRoom || usersInRoom.length === 0) {
                console.log("No users in room:", roomId);
                return;
            }

            roomVotes[roomId] = {
                votes: [],
                totalPlayers: usersInRoom.length
            };

            io.to(roomId).emit("showVote", {
                players: usersInRoom.map(u => ({
                    id: u.userId,
                    username: u.username
                }))
            });

        } catch (error) {
            console.error("endGame error:", error);
        }
    });

    socket.on("submitVote", async ({ roomId, voter, voteFor }) => {
        try {
            if (!roomVotes[roomId]) {
                roomVotes[roomId] = { votes: [], totalPlayers: 0 };
            }

            const existingVoteIndex = roomVotes[roomId].votes.findIndex(v => v.voter === voter);
            if (existingVoteIndex !== -1) {
                roomVotes[roomId].votes[existingVoteIndex] = { voter, voteFor };
            } else {
                roomVotes[roomId].votes.push({ voter, voteFor });
            }

            const usersInRoom = roomUsers[roomId] || [];
            if (roomVotes[roomId].votes.length >= usersInRoom.length) {

                const gameData = roomGameData[roomId];
                if (!gameData) {
                    console.error("No game data found for room:", roomId);
                    return;
                }

                // Oy sonuçlarını hesapla
                const voteCount = {};
                roomVotes[roomId].votes.forEach(vote => {
                    const votedUser = usersInRoom.find(u => u.userId === vote.voteFor);
                    const votedUsername = votedUser ? votedUser.username : vote.voteFor;
                    voteCount[votedUsername] = (voteCount[votedUsername] || 0) + 1;
                });

                const results = {
                    spy_username: gameData.spy_username,
                    keyword: gameData.keyword,
                    spy_keyword: gameData.spy_keyword,
                    votes: roomVotes[roomId].votes.map(vote => {
                        const votedUser = usersInRoom.find(u => u.userId === vote.voteFor);
                        return {
                            voter: vote.voter,
                            votedFor: votedUser ? votedUser.username : vote.voteFor
                        };
                    }),
                    voteCount: voteCount
                };

                io.to(roomId).emit("voteResults", results);

                delete roomVotes[roomId];
                delete roomGameData[roomId];
            }

        } catch (error) {
            console.error("submitVote error:", error);
        }
    });

    socket.on("startTimer", async ({ roomId, duration, isOwner }) => {
        try {
            const room = await models.getRoomById(roomId);
            if (!room) {
                socket.emit("timerError", { message: "Oda bulunamadı" });
                return;
            }

            if (rooms.has(roomId)) {
                const existingRoom = rooms.get(roomId);
                if (existingRoom.timer?.interval) {
                    clearInterval(existingRoom.timer.interval);
                }
            }

            let roomData = rooms.get(roomId) || {};

            roomData.timer = {
                timeLeft: duration,
                running: true,
                interval: null,
                roomId: roomId
            };

            roomData.timer.interval = setInterval(() => {
                if (roomData.timer.timeLeft > 0) {
                    roomData.timer.timeLeft--;
                    io.to(roomId).emit("timerUpdate", roomData.timer.timeLeft);
                } else {
                    clearInterval(roomData.timer.interval);
                    roomData.timer.running = false;
                    io.to(roomId).emit("timerEnded");

                    delete roomData.timer;
                    if (Object.keys(roomData).length === 0) {
                        rooms.delete(roomId);
                    } else {
                        rooms.set(roomId, roomData);
                    }
                }
            }, 1000);

            rooms.set(roomId, roomData);

            io.to(roomId).emit("timerUpdate", roomData.timer.timeLeft);

        } catch (error) {
            console.error("startTimer error:", error);
            socket.emit("timerError", { message: "Timer başlatılamadı: " + error.message });
        }
    });
    socket.on("pauseTimer", ({ roomId }) => {
        try {
            const roomData = rooms.get(roomId);
            if (!roomData || !roomData.timer) {
                socket.emit("timerError", { message: "Aktif timer bulunamadı" });
                return;
            }

            if (roomData.timer.interval) {
                clearInterval(roomData.timer.interval);
                roomData.timer.interval = null;
                roomData.timer.running = false;
                io.to(roomId).emit("timerPaused", roomData.timer.timeLeft);
            }
        } catch (error) {
            console.error("pauseTimer error:", error);
        }
    });

    socket.on("resumeTimer", ({ roomId }) => {
        try {
            const roomData = rooms.get(roomId);

            if (!roomData || !roomData.timer) {
                socket.emit("timerError", { message: "Timer bulunamadı" });
                return;
            }

            if (!roomData.timer.running && roomData.timer.timeLeft > 0) {
                roomData.timer.running = true;

                roomData.timer.interval = setInterval(() => {
                    if (roomData.timer.timeLeft > 0) {
                        roomData.timer.timeLeft--;
                        io.to(roomId).emit("timerUpdate", roomData.timer.timeLeft);
                    } else {
                        clearInterval(roomData.timer.interval);
                        roomData.timer.running = false;
                        io.to(roomId).emit("timerEnded");

                        delete roomData.timer;
                        if (Object.keys(roomData).length === 0) {
                            rooms.delete(roomId);
                        } else {
                            rooms.set(roomId, roomData);
                        }
                    }
                }, 1000);

                io.to(roomId).emit("timerResumed", roomData.timer.timeLeft);
            } else {
                console.log("Timer cannot be resumed:", {
                    running: roomData.timer.running,
                    timeLeft: roomData.timer.timeLeft
                });
            }
        } catch (error) {
            console.error("resumeTimer error:", error);
            socket.emit("timerError", { message: "Timer devam ettirilemedi: " + error.message });
        }
    });

    socket.on("disconnect", () => {
        for (const roomId in roomUsers) {
            const index = roomUsers[roomId].findIndex(u => u.id === socket.id);
            if (index !== -1) {
                roomUsers[roomId].splice(index, 1);
                io.to(roomId).emit("updateUserList", roomUsers[roomId]);

                if (roomUsers[roomId].length === 0) {
                    const roomData = rooms.get(roomId);
                    if (roomData && roomData.timer && roomData.timer.interval) {
                        clearInterval(roomData.timer.interval);
                        rooms.delete(roomId);
                    }
                    delete roomGameData[roomId];
                    delete roomVotes[roomId];
                }
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
    console.log(`API sunucusu çalışıyor: hhtp://localhost:${port}`);
});