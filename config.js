module.exports = {
    // Bot Settings
    BOT_NAME: '💞Selina-Admin-Bot💞',
    OWNER_NAME: 'AshenEdtz',
    OWNER_NUMBER: '94726962984',
    PREFIX: '.',
    MODE: 'private', // private or public
    
    // AI Settings - 24/7 Auto Reply
    AI_ENABLED: true,
    AI_AUTO_REPLY: true,
    AI_CHAT_MODE: true, // Real conversation mode
    
    // Links
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VavLxme5PO0yDv3eUa47',
    CHANNEL_JID: '0029VavLxme5PO0yDv3eUa47@newsletter',
    PROFILE_PIC: 'https://i.imgur.com/WSXTUGI.jpeg',
    
    // Footer
    FOOTER: '💞 Powered by Selina-Admin-Bot 💞\n© AshenEdtz 2024',
    
    // Anti-Ban Protection
    ANTI_BAN: true,
    MSG_DELAY: 1200, // Delay between messages
    MAX_MSGS_PER_MINUTE: 18,
    TYPING_DELAY: 2000, // Simulate typing
    
    // Session Management
    SESSION_ID: 'SELINA_SESSION',
    AUTO_READ: true,
    AUTO_TYPING: true,
    ALWAYS_ONLINE: true,
    
    // AI API Configuration (Multiple backups for 24/7)
    AI_APIS: [
        {
            name: 'GPT-4',
            url: 'https://api.yanzbotz.my.id/api/ai/gpt4',
            method: 'GET',
            params: (text) => ({ query: text })
        },
        {
            name: 'Gemini',
            url: 'https://api.ryzendesu.vip/api/ai/gemini',
            method: 'GET',
            params: (text) => ({ text: text })
        },
        {
            name: 'ChatGPT',
            url: 'https://api.betabotz.eu.org/api/search/openai-chat',
            method: 'GET',
            params: (text) => ({ text: text })
        },
        {
            name: 'Hercai',
            url: 'https://hercai.onrender.com/v3/hercai',
            method: 'GET',
            params: (text) => ({ question: text })
        },
        {
            name: 'SimSimi',
            url: 'https://api.simsimi.vn/v2/simtalk',
            method: 'POST',
            params: (text) => ({ text: text, lc: 'en' })
        }
    ],
    
    // Command Settings
    ALIVE_MSG: `╭━━━━━━━━━━━━━━━━━╮
┃ ✨ *SELINA IS ALIVE* ✨
┃━━━━━━━━━━━━━━━━━
┃ 🤖 *Bot:* 💞Selina-Admin-Bot💞
┃ 👤 *Owner:* AshenEdtz
┃ ⚡ *Status:* Online 24/7
┃ 🧠 *AI:* Active
┃ 📍 *Mode:* Private Only
┃ 🕐 *Uptime:* {uptime}
┃━━━━━━━━━━━━━━━━━
┃ 💞 Always Here For You!
╰━━━━━━━━━━━━━━━━━╯`,

    MENU_MSG: `╭━━━『 💞 SELINA MENU 💞 』━━━╮
┃
┃  👋 *Hello {user}!*
┃  
┃  🤖 *Bot:* {botname}
┃  👤 *Owner:* {owner}
┃  ⚡ *Prefix:* {prefix}
┃  🧠 *AI Mode:* {ai_status}
┃  🕐 *Time:* {time}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎯 MAIN COMMANDS 』━━━╮
┃
┃  🏠 {prefix}menu
┃  🏓 {prefix}ping
┃  ✨ {prefix}alive
┃  👤 {prefix}owner
┃  📢 {prefix}channel
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🧠 AI COMMANDS 』━━━╮
┃
┃  🤖 {prefix}ai <text>
┃  💬 {prefix}chat <text>
┃  🎨 {prefix}imagine <text>
┃  
┃  💡 *Just chat with me!*
┃  I respond automatically 24/7
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎮 FUN COMMANDS 』━━━╮
┃
┃  😂 {prefix}joke
┃  💭 {prefix}quote
┃  🎲 {prefix}fact
┃  🌟 {prefix}advice
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 ⚙️ SYSTEM 』━━━╮
┃
┃  📊 {prefix}status
┃  🔄 {prefix}restart
┃  ℹ️ {prefix}info
┃
╰━━━━━━━━━━━━━━━━━━━━╯

📢 *Channel:* {channel}

{footer}`
};
