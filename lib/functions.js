const moment = require("moment-timezone");

/**
 * Sleep/delay function
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format time
 */
function formatTime() {
    return moment.tz("Asia/Colombo").format("HH:mm:ss DD/MM/YYYY");
}

/**
 * Get uptime
 */
function getUptime(startTime) {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    
    let uptimeStr = '';
    if (days > 0) uptimeStr += `${days}d `;
    if (hours > 0) uptimeStr += `${hours}h `;
    if (minutes > 0) uptimeStr += `${minutes}m `;
    uptimeStr += `${seconds}s`;
    
    return uptimeStr.trim();
}

/**
 * Format bytes
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Random element from array
 */
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    sleep,
    formatTime,
    getUptime,
    formatBytes,
    randomElement
};
