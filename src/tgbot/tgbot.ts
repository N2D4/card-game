import TelegramBot from 'node-telegram-bot-api';

export function startBot() {
    const token = process.env.TG_API_KEY || 'not set';
    const gameName = process.env.TG_GAME_NAME || 'not set';
    const gameURL = process.env.TG_GAME_URL || 'not set';

    // Create a bot that uses 'polling' to fetch new updates
    const bot = new TelegramBot(token, {polling: true});

    // Matches "/echo [whatever]"
    bot.onText(/\/play/, (msg) => {
        // send back the matched "whatever" to the chat
        bot.sendGame(msg.chat.id, gameName);
    });

    bot.on('callback_query', (callbackQuery) => {
        bot.answerCallbackQuery(callbackQuery.id, { url: gameURL });
    });

    bot.on('inline_query', (callbackQuery) => {
        bot.answerInlineQuery(callbackQuery.id, [{
            type: 'game',
            id: gameName,
            game_short_name: gameName
        }]);
    });
}
