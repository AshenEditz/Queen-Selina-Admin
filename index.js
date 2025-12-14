const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    jidDecode,
    proto,
    getContentType,
    downloadContentFromMessage,
    Browsers
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const chalk = require("chalk");
const axios = require("axios");
const qrcode = require("qrcode-terminal");
const moment = require("moment-timezone");
const config = require("./config");
const { getAIResponse, chatWithAI } = require("./lib/ai");
const { sleep, formatTime, getUptime, formatBytes } = require("./lib/functions");

// Global variables
let startTime = Date.now();
const messageTracker = new Map();
const userSessions = new Map();

// Anti-ban message tracking
function checkRateLimit(from) {
    if (!config.ANTI_BAN) return true;
    
    const now = Date.now();
    const tracker = messageTracker.get(from) || { count: 0, firstMsg: now };
    
    if (now - tracker.firstMsg > 60000) {
        tracker.count = 1;
        tracker.firstMsg = now;
    } else {
        tracker.count++;
    }
    
    messageTracker.set(from, tracker);
    
    if (tracker.count > config.MAX_MSGS_PER_MINUTE) {
        console.log(chalk.yellow(`⚠️ Rate limit: ${from}`));
        return false;
    }
    
    return true;
}

// Main connection function
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.macOS("Desktop"),
        version,
        keepAliveIntervalMs: 50000,
        markOnlineOnConnect: config.ALWAYS_ONLINE,
        defaultQueryTimeoutMs: undefined,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return proto.Message.fromObject({});
        }
    });

    const store = makeInMemoryStore({
        logger: pino().child({ level: "silent", stream: "store" })
    });
    store.bind(conn.ev);

    // Connection method selection
    if (!conn.authState.creds.registered) {
        console.log(chalk.bgMagenta.white('\n╔═══════════════════════════════╗'));
        console.log(chalk.bgMagenta.white('║  💞 SELINA-ADMIN-BOT 💞      ║'));
        console.log(chalk.bgMagenta.white('╚═══════════════════════════════╝\n'));
        
        console.log(chalk.cyan('📱 Choose Connection Method:\n'));
        console.log(chalk.green('  [1] QR Code'));
        console.log(chalk.green('  [2] Pairing Code\n'));

        const readline = require("readline").createInterface({
            input: process.stdin,
            output: process.stdout
        });

        readline.question(chalk.yellow('Enter your choice (1 or 2): '), async (choice) => {
            if (choice.trim() === "2") {
                readline.question(chalk.yellow('Enter phone number (with country code, e.g., 94726962984): '), async (phoneNumber) => {
                    try {
                        const code = await conn.requestPairingCode(phoneNumber.trim());
                        console.log(chalk.bgGreen.black(`\n✅ Your Pairing Code: ${code}\n`));
                        console.log(chalk.cyan('Enter this code in WhatsApp: Settings > Linked Devices > Link Device\n'));
                    } catch (error) {
                        console.log(chalk.red('❌ Error getting pairing code:', error.message));
                    }
                    readline.close();
                });
            } else {
                console.log(chalk.yellow('\n📱 Waiting for QR Code...\n'));
                readline.close();
            }
        });
    }

    // Connection updates
    conn.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(chalk.yellow('\n╔════════════════════════════╗'));
            console.log(chalk.yellow('║   SCAN QR CODE BELOW 👇   ║'));
            console.log(chalk.yellow('╚════════════════════════════╝\n'));
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
            console.log(chalk.green('\n╔════════════════════════════════╗'));
            console.log(chalk.green('║  ✅ CONNECTED SUCCESSFULLY!   ║'));
            console.log(chalk.green('╚════════════════════════════════╝\n'));
            console.log(chalk.cyan(`🤖 Bot: ${config.BOT_NAME}`));
            console.log(chalk.cyan(`👤 Owner: ${config.OWNER_NAME}`));
            console.log(chalk.cyan(`🧠 AI Mode: ${config.AI_AUTO_REPLY ? 'ON ✅' : 'OFF ❌'}`));
            console.log(chalk.cyan(`⚡ Status: Running 24/7\n`));
            
            // Set profile picture
            try {
                const ppBuffer = await axios.get(config.PROFILE_PIC, { 
                    responseType: 'arraybuffer',
                    timeout: 10000 
                });
                await conn.updateProfilePicture(conn.user.id, Buffer.from(ppBuffer.data));
                console.log(chalk.green("✅ Profile picture updated!\n"));
            } catch (error) {
                console.log(chalk.yellow("⚠️ Could not update profile picture\n"));
            }

            // Set status
            try {
                await conn.updateProfileStatus(`💞 Selina Bot | 24/7 AI Chat | ${config.OWNER_NAME}`);
            } catch (error) {}
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red("❌ Connection closed!"), shouldReconnect ? "Reconnecting..." : "Logged out");
            
            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(), 3000);
            }
        }
    });

    conn.ev.on("creds.update", saveCreds);

    // Message handler
    conn.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            if (mek.key.fromMe) return; // Ignore own messages

            const message = mek.message;
            const type = getContentType(message);
            const from = mek.key.remoteJid;
            const body = (type === "conversation") ? message.conversation :
                        (type === "extendedTextMessage") ? message.extendedTextMessage.text :
                        (type === "imageMessage") ? message.imageMessage.caption :
                        (type === "videoMessage") ? message.videoMessage.caption : "";

            if (!body) return;

            const isGroup = from.endsWith("@g.us");
            const sender = isGroup ? mek.key.participant : from;
            const senderNumber = sender.split("@")[0];
            const pushname = mek.pushName || "User";
            const isOwner = senderNumber === config.OWNER_NUMBER;
            const isCmd = body.startsWith(config.PREFIX);
            const command = isCmd ? body.slice(config.PREFIX.length).trim().split(" ")[0].toLowerCase() : "";
            const args = body.trim().split(/ +/).slice(1);
            const q = args.join(" ");

            // Ignore groups
            if (isGroup) return;

            // Rate limiting
            if (!checkRateLimit(from)) return;

            // Anti-ban delay
            if (config.ANTI_BAN) {
                await sleep(config.MSG_DELAY);
            }

            // Auto typing and read
            if (config.AUTO_TYPING) {
                await conn.sendPresenceUpdate('composing', from);
            }
            if (config.AUTO_READ) {
                await conn.readMessages([mek.key]);
            }

            // Fake quoted message
            const getQuotedMessage = async () => {
                try {
                    const thumbBuffer = await axios.get(config.PROFILE_PIC, { responseType: 'arraybuffer' });
                    return {
                        key: {
                            remoteJid: config.CHANNEL_JID,
                            fromMe: false,
                            id: 'SELINA' + Math.random().toString(36).substr(2, 9),
                            participant: '0@s.whatsapp.net'
                        },
                        message: {
                            groupInviteMessage: {
                                groupJid: config.CHANNEL_JID,
                                inviteCode: "Selina2024",
                                groupName: "💞 Selina Community 💞",
                                caption: "Join our channel!",
                                jpegThumbnail: Buffer.from(thumbBuffer.data)
                            }
                        }
                    };
                } catch {
                    return null;
                }
            };

            const quoted = await getQuotedMessage();

            // Reply function
            const reply = async (text) => {
                const fullText = `${config.BOT_NAME}\n\n${text}\n\n${config.FOOTER}`;
                
                return await conn.sendMessage(from, {
                    text: fullText,
                    contextInfo: {
                        mentionedJid: [sender],
                        forwardingScore: 1,
                        isForwarded: true,
                        externalAdReply: {
                            title: config.BOT_NAME,
                            body: `By ${config.OWNER_NAME}`,
                            thumbnailUrl: config.PROFILE_PIC,
                            sourceUrl: config.CHANNEL_LINK,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: quoted });
            };

            // Image reply function
            const replyWithImage = async (imageUrl, caption) => {
                const fullCaption = `${config.BOT_NAME}\n\n${caption}\n\n${config.FOOTER}`;
                
                return await conn.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: fullCaption,
                    contextInfo: {
                        mentionedJid: [sender],
                        forwardingScore: 1,
                        isForwarded: true
                    }
                }, { quoted: quoted });
            };

            // Command handler
            console.log(chalk.blue(`[${formatTime()}] ${pushname}: ${body}`));

            switch (command) {
                case "menu":
                case "help":
                case "commands":
                    const menuText = config.MENU_MSG
                        .replace(/{user}/g, pushname)
                        .replace(/{botname}/g, config.BOT_NAME)
                        .replace(/{owner}/g, config.OWNER_NAME)
                        .replace(/{prefix}/g, config.PREFIX)
                        .replace(/{ai_status}/g, config.AI_AUTO_REPLY ? 'ON ✅' : 'OFF ❌')
                        .replace(/{time}/g, formatTime())
                        .replace(/{channel}/g, config.CHANNEL_LINK)
                        .replace(/{footer}/g, config.FOOTER);
                    
                    await replyWithImage(config.PROFILE_PIC, menuText);
                    break;

                case "ping":
                    const start = Date.now();
                    const pingMsg = await reply("⚡ Checking speed...");
                    const end = Date.now();
                    const ping = end - start;
                    
                    await conn.sendMessage(from, {
                        text: `${config.BOT_NAME}\n\n🏓 *Pong!*\n\n⚡ *Speed:* ${ping}ms\n📡 *Status:* Online 24/7\n🧠 *AI:* Active\n\n${config.FOOTER}`,
                        edit: pingMsg.key
                    });
                    break;

                case "alive":
                case "runtime":
                    const aliveText = config.ALIVE_MSG.replace(/{uptime}/g, getUptime(startTime));
                    await replyWithImage(config.PROFILE_PIC, aliveText);
                    break;

                case "ai":
                case "chat":
                case "ask":
                    if (!q) return reply("❌ Please provide text!\n\n*Example:* .ai Hello, how are you?");
                    
                    await conn.sendPresenceUpdate('composing', from);
                    await sleep(config.TYPING_DELAY);
                    
                    const aiResponse = await chatWithAI(q, senderNumber);
                    await reply(`🧠 *AI Response:*\n\n${aiResponse}`);
                    break;

                case "owner":
                case "dev":
                case "creator":
                    const ownerText = `╭━━━『 👤 OWNER INFO 』━━━╮
┃
┃  📛 *Name:* ${config.OWNER_NAME}
┃  📞 *Number:* +${config.OWNER_NUMBER}
┃  🤖 *Bot:* ${config.BOT_NAME}
┃  💼 *Role:* Developer
┃  
┃  💞 Thank you for using Selina!
┃
╰━━━━━━━━━━━━━━━━━━━━╯`;
                    
                    await conn.sendMessage(from, {
                        contact: {
                            displayName: config.OWNER_NAME,
                            contacts: [{
                                displayName: config.OWNER_NAME,
                                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${config.OWNER_NAME}\nTEL;type=CELL;type=VOICE;waid=${config.OWNER_NUMBER}:+${config.OWNER_NUMBER}\nEND:VCARD`
                            }]
                        }
                    }, { quoted: quoted });
                    
                    await reply(ownerText);
                    break;

                case "channel":
                    await reply(`📢 *Join Our Official Channel!*\n\n🔗 ${config.CHANNEL_LINK}\n\n✨ Get updates about:\n• New features\n• Bot updates\n• Tips & tricks\n• And more!\n\n💞 Join now and stay connected!`);
                    break;

                case "status":
                case "info":
                    const statusText = `╭━━━『 📊 BOT STATUS 』━━━╮
┃
┃  🤖 *Bot:* ${config.BOT_NAME}
┃  ⚡ *Status:* Online
┃  🕐 *Uptime:* ${getUptime(startTime)}
┃  🧠 *AI:* ${config.AI_AUTO_REPLY ? 'Active ✅' : 'Inactive ❌'}
┃  📡 *Mode:* ${config.MODE}
┃  💾 *Memory:* ${formatBytes(process.memoryUsage().heapUsed)}
┃  📱 *Platform:* WhatsApp
┃  🌐 *24/7:* Yes ✅
┃
╰━━━━━━━━━━━━━━━━━━━━╯`;
                    await reply(statusText);
                    break;

                case "joke":
                    try {
                        const jokeRes = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 10000 });
                        await reply(`😂 *Random Joke:*\n\n${jokeRes.data.setup}\n\n*${jokeRes.data.punchline}* 🤣`);
                    } catch {
                        await reply("❌ Failed to fetch joke. Try again!");
                    }
                    break;

                case "quote":
                    try {
                        const quoteRes = await axios.get('https://api.quotable.io/random', { timeout: 10000 });
                        await reply(`💭 *Inspirational Quote:*\n\n_"${quoteRes.data.content}"_\n\n— *${quoteRes.data.author}*`);
                    } catch {
                        await reply("❌ Failed to fetch quote. Try again!");
                    }
                    break;

                case "fact":
                    try {
                        const factRes = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en', { timeout: 10000 });
                        await reply(`🎲 *Random Fact:*\n\n${factRes.data.text}`);
                    } catch {
                        await reply("❌ Failed to fetch fact. Try again!");
                    }
                    break;

                case "advice":
                    try {
                        const adviceRes = await axios.get('https://api.adviceslip.com/advice', { timeout: 10000 });
                        await reply(`🌟 *Advice:*\n\n${adviceRes.data.slip.advice}`);
                    } catch {
                        await reply("❌ Failed to fetch advice. Try again!");
                    }
                    break;

                case "restart":
                    if (!isOwner) return reply("❌ This command is only for the owner!");
                    await reply("🔄 Restarting bot...");
                    process.exit();
                    break;

                default:
                    // 24/7 AI Auto Reply
                    if (config.AI_AUTO_REPLY && !isCmd && body.length > 1) {
                        await conn.sendPresenceUpdate('composing', from);
                        await sleep(config.TYPING_DELAY);
                        
                        const autoAiResponse = await chatWithAI(body, senderNumber);
                        await reply(autoAiResponse);
                    }
                    break;
            }

            // Reset typing
            if (config.AUTO_TYPING) {
                await conn.sendPresenceUpdate('paused', from);
            }

        } catch (error) {
            console.error(chalk.red("[ERROR]"), error);
        }
    });

    // Keep connection alive
    setInterval(() => {
        if (conn.ws.readyState !== 1) {
            console.log(chalk.yellow("⚠️ Connection lost. Reconnecting..."));
            connectToWhatsApp();
        }
    }, 30000);

    return conn;
}

// Start bot
console.log(chalk.bgMagenta.white(`
╔════════════════════════════════╗
║   💞 SELINA-ADMIN-BOT 💞      ║
║   24/7 AI WhatsApp Bot         ║
║   Created by: AshenEdtz        ║
║   Version: 2.0.0               ║
╚════════════════════════════════╝
`));

connectToWhatsApp().catch((error) => {
    console.error(chalk.red("Fatal Error:"), error);
    process.exit(1);
});

// Handle process errors
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('Unhandled Rejection:'), error);
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught Exception:'), error);
});
