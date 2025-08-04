const pool = require('./db');
const { generateRoomId } = require('./utils'); // utils'ten import et

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
const addGame = async (spy_id, keyword) => {
    const query = 'INSERT INTO games (spy_id, keyword) VALUES ($1, $2) RETURNING *';
    const values = [spy_id, keyword];
    const result = await pool.query(query, values);
    return result.rows[0];
};

module.exports = {
    addType,
    addRoom,
    addUser,
    addGame
};
