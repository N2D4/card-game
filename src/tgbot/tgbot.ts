import TelegramBot from 'node-telegram-bot-api';
import {LobbyType} from 'src/server/Matchmaker';

function createURLIDFromID(id: string): string {
    if (id.match(/^[a-zA-Z0-9\-_]*$/)) return 'tg-' + id;
    return 'tg/b64-' + btoa(id);
}

export function startBot(createLobby: (s: string) => void) {
    const token = process.env.TG_API_KEY || 'not set';
    const gameName = process.env.TG_GAME_NAME || 'not set';
    const admins = new Set((process.env.TG_ADMIN_IDS || '').split(',').map(a => Number(a)));
    let gameURL = process.env.TG_GAME_URL || 'not set';
    if (gameURL.endsWith('/')) gameURL = gameURL.substr(0, gameURL.length - 1);

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
            console.log(`Admin with id ${msg.from?.id} stopped the server! Will stop in 1000ms`);
            setTimeout(() => process.exit(), 1000);
        } else {
            bot.sendMessage(msg.chat.id, `You don't have permissions to do this!`);
        }
    });

    // user types @bot
    bot.on('inline_query', (inlineQuery) => {
        console.log('inline_query');
        bot.answerInlineQuery(inlineQuery.id, [{
            type: 'game',
            id: gameName,
            game_short_name: gameName
        }]);
    });

    // user types @bot, selects the game and presses enter
    bot.on('chosen_inline_result', (inlineResult) => {
        console.log('chosen_inline_result');
        if (inlineResult.inline_message_id === undefined) throw new Error('inlineResult.inline_message_id is undefined!');

        createLobby(createURLIDFromID(inlineResult.inline_message_id));
    });

    // user presses play button on the game message
    bot.on('callback_query', (callbackQuery) => {
        console.log('callback_query');
        if (callbackQuery.inline_message_id === undefined) throw new Error('callbackQuery.inline_message_id is undefined!');

        bot.answerCallbackQuery(callbackQuery.id, {
            url: gameURL + '/join/' + createURLIDFromID(callbackQuery.inline_message_id)
        });
    });
}
