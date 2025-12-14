const axios = require("axios");
const config = require("../config");

// User conversation context (for better AI chat)
const conversationContext = new Map();

/**
 * Get AI response with fallback APIs
 */
async function getAIResponse(text) {
    for (const api of config.AI_APIS) {
        try {
            console.log(`🤖 Trying ${api.name}...`);
            
            let response;
            
            if (api.method === 'POST') {
                response = await axios.post(api.url, api.params(text), {
                    timeout: 15000,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                response = await axios.get(api.url, {
                    params: api.params(text),
                    timeout: 15000
                });
            }

            // Extract response based on API
            let aiReply = null;

            // Try different response formats
            if (response.data) {
                aiReply = response.data.result ||
                         response.data.response ||
                         response.data.message ||
                         response.data.reply ||
                         response.data.answer ||
                         response.data.text ||
                         response.data.data?.response ||
                         response.data.data?.message;
            }

            if (aiReply && typeof aiReply === 'string' && aiReply.trim().length > 0) {
                console.log(`✅ ${api.name} responded`);
                return aiReply.trim();
            }

        } catch (error) {
            console.log(`❌ ${api.name} failed:`, error.message);
            continue;
        }
    }

    // If all APIs fail, return fallback message
    return "I'm experiencing some technical difficulties right now. Please try again in a moment! 😊";
}

/**
 * Chat with AI (with conversation context)
 */
async function chatWithAI(text, userId) {
    // Get or create user context
    let context = conversationContext.get(userId) || [];
    
    // Add user message to context
    context.push({ role: 'user', content: text });
    
    // Keep only last 10 messages for context
    if (context.length > 10) {
        context = context.slice(-10);
    }
    
    // Get AI response
    const aiResponse = await getAIResponse(text);
    
    // Add AI response to context
    context.push({ role: 'assistant', content: aiResponse });
    
    // Save context
    conversationContext.set(userId, context);
    
    // Clear old contexts (after 1 hour)
    setTimeout(() => {
        conversationContext.delete(userId);
    }, 3600000);
    
    return aiResponse;
}

/**
 * Advanced AI with GPT-4
 */
async function advancedAI(text) {
    const apis = [
        {
            url: 'https://api.yanzbotz.my.id/api/ai/gpt4',
            params: { query: text }
        },
        {
            url: 'https://api.betabotz.eu.org/api/search/openai-chat',
            params: { text: text, logic: 'You are Selina, a helpful and friendly AI assistant created by AshenEdtz. You are kind, intelligent, and always ready to help.' }
        },
        {
            url: 'https://api.ryzendesu.vip/api/ai/chatgpt',
            params: { text: text, prompt: 'You are Selina, an AI assistant. Be helpful and friendly.' }
        }
    ];

    for (const api of apis) {
        try {
            const response = await axios.get(api.url, {
                params: api.params,
                timeout: 20000
            });

            const result = response.data?.result || response.data?.response || response.data?.message;
            
            if (result && result.length > 0) {
                return result;
            }
        } catch (error) {
            continue;
        }
    }

    return getAIResponse(text);
}

module.exports = { 
    getAIResponse, 
    chatWithAI,
    advancedAI 
};
