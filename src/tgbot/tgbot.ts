import TelegramBot from 'node-telegram-bot-api';

export function startBot() {
    const token = process.env.TG_API_KEY || 'not set';
    const gameName = process.env.TG_GAME_NAME || 'not set';
    const gameURL = process.env.TG_GAME_URL || 'not set';
    const admins = new Set((process.env.TG_ADMIN_IDS || '').split(',').map(a => Number(a)));

    const bot = new TelegramBot(token, {polling: true});

    bot.onText(/\/play/, (msg) => {
        bot.sendGame(msg.chat.id, gameName);
    });

    bot.onText(/\/myid/, (msg) => {
        bot.sendMessage(msg.chat.id, `Your ID: ${msg.from?.id}`);
    });

    bot.onText(/\/stop/, (msg) => {
        const fromID = msg.from?.id;
        if (fromID !== undefined && admins.has(fromID)) {
            bot.sendMessage(msg.chat.id, `Stopping the server.`);
            console.log(`Admin with id ${msg.from?.id} stopped the server!`);
            process.exit();
        } else {
            bot.sendMessage(msg.chat.id, `You don't have permissions to do this!`);
        }
    });

    bot.on('callback_query', (callbackQuery) => {
        bot.answerCallbackQuery(callbackQuery.id, { url: gameURL });
    });

    bot.on('inline_query', (inlineQuery) => {
        bot.answerInlineQuery(inlineQuery.id, [{
            type: 'game',
            id: gameName,
            game_short_name: gameName
        }]);
    });
}
