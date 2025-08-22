const pool = require('./db');
const { generateRoomId } = require('./utils');

/* ----------------------- TYPES ----------------------- */
const addType = async (title, typeArray) => {
    const query = 'INSERT INTO types (title, type) VALUES ($1, $2) RETURNING *';
    const values = [title, typeArray]; // type artık JSON değil, dizi
    const result = await pool.query(query, values);
    return result.rows[0];
};

/* ----------------------- ROOMS ----------------------- */
const addRoom = async (type_id) => {
    const id = generateRoomId();
    const query = 'INSERT INTO rooms (id, type_id) VALUES ($1, $2) RETURNING *';
    const values = [id, type_id];
    const result = await pool.query(query, values);
    return result.rows[0];
};

/* ----------------------- USERS ----------------------- */
const addUser = async (username, rooms_id) => {
    const query = 'INSERT INTO users (username, rooms_id) VALUES ($1, $2) RETURNING *';
    const values = [username, rooms_id];
    const result = await pool.query(query, values);
    return result.rows[0];
};

/* ----------------------- GAMES ----------------------- */
// const addGame = async (spy_id, keyword) => {
//     const query = 'INSERT INTO games (spy_id, keyword) VALUES ($1, $2) RETURNING *';
//     const values = [spy_id, keyword];
//     const result = await pool.query(query, values);
//     return result.rows[0];
// };

const createRoomWithUser = async (username, type_id = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // duplicate kontrolü transaction içinde
        const check = await client.query('SELECT 1 FROM users WHERE username = $1', [username]);
        if (check.rowCount > 0) {
            const err = new Error('Kullanıcı adı zaten mevcut.');
            err.code = 'DUPLICATE_USERNAME';
            throw err;
        }
        const userRes = await client.query(
            'INSERT INTO users (username) VALUES ($1) RETURNING *',
            [username]
        );
        const ownerId = userRes.rows[0].id;

        const id = generateRoomId();
        const roomRes = await client.query(
            'INSERT INTO rooms (id, type_id, owner_id) VALUES ($1, $2, $3) RETURNING *',
            [id, type_id, ownerId]
        );

        await client.query(
            'UPDATE users SET rooms_id = $1 WHERE id = $2',
            [roomRes.rows[0].id, ownerId]
        );

        await client.query('COMMIT');
        return { room: roomRes.rows[0], user: userRes.rows[0] };
    } catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        throw err;
    } finally {
        client.release();
    }
};

const getRoomById = async (id) => {
    const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
    return result.rows[0] || null;
};

async function getUserByUsername(username) {
    const result = await pool.query(`SELECT * FROM users WHERE username = $1 LIMIT 1`, [username]);
    return result.rows[0] || null;
}

async function getAllTypes() {
    const res = await pool.query("SELECT title, type FROM types");
    return res.rows.map((row) => ({
        title: row.title,
        selected: true,
        type: (row.type || []).map((name) => ({ name, selected: true })),
    }));
};
async function getUserById(id) {
    const res = await pool.query(
        "SELECT id, username FROM users WHERE id = $1 LIMIT 1",
        [id]
    );
    return res.rows[0] || null;
};
async function addGame(spy_id, keyword) {
    const client = await pool.connect();
    try {
        const res = await client.query(
            `INSERT INTO games (spy_id, keyword) VALUES ($1::uuid, $2) RETURNING *`,
            [spy_id, keyword]
        );
        return res.rows[0];
    } finally {
        client.release();
    }
}

module.exports = {
    addType,
    addRoom,
    addUser,
    addGame,
    createRoomWithUser,
    getRoomById,
    getUserByUsername,
    getAllTypes,
    getUserById
};