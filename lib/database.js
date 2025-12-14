const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.json');

// Initialize database
let database = {
    users: {},
    settings: {},
    blocked: [],
    premium: []
};

// Load database
function loadDatabase() {
    try {
        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf8');
            database = JSON.parse(data);
        }
    } catch (error) {
        console.log('Creating new database...');
        saveDatabase();
    }
}

// Save database
function saveDatabase() {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

// Add user
function addUser(userId, data = {}) {
    if (!database.users[userId]) {
        database.users[userId] = {
            id: userId,
            name: data.name || 'User',
            joinDate: Date.now(),
            messageCount: 0,
            lastMessage: Date.now(),
            ...data
        };
        saveDatabase();
    }
}

// Update user
function updateUser(userId, data) {
    if (database.users[userId]) {
        database.users[userId] = {
            ...database.users[userId],
            ...data,
            lastMessage: Date.now()
        };
        saveDatabase();
    }
}

// Get user
function getUser(userId) {
    return database.users[userId] || null;
}

// Increment message count
function incrementMessageCount(userId) {
    if (database.users[userId]) {
        database.users[userId].messageCount++;
        database.users[userId].lastMessage = Date.now();
        saveDatabase();
    }
}

// Block user
function blockUser(userId) {
    if (!database.blocked.includes(userId)) {
        database.blocked.push(userId);
        saveDatabase();
    }
}

// Unblock user
function unblockUser(userId) {
    database.blocked = database.blocked.filter(id => id !== userId);
    saveDatabase();
}

// Check if blocked
function isBlocked(userId) {
    return database.blocked.includes(userId);
}

// Get all users
function getAllUsers() {
    return database.users;
}

// Get user count
function getUserCount() {
    return Object.keys(database.users).length;
}

// Get total messages
function getTotalMessages() {
    return Object.values(database.users).reduce((sum, user) => sum + user.messageCount, 0);
}

// Initialize
loadDatabase();

module.exports = {
    addUser,
    updateUser,
    getUser,
    incrementMessageCount,
    blockUser,
    unblockUser,
    isBlocked,
    getAllUsers,
    getUserCount,
    getTotalMessages,
    saveDatabase,
    database
};
