import express from 'express';
import fs from 'fs';
import { Bot, InlineKeyboard } from 'grammy';
import path from 'path';
import { createClient } from 'redis';

import {
    homepage, license, repository, version,
} from '../package.json';
import env from './utils/env';
import { generate } from './utils/generate';
import { log } from './utils/log';
import { match } from './utils/match';

// create /output directory if not exists
if (!fs.existsSync(path.join(__dirname, '../output'))) {
    fs.mkdirSync(path.join(__dirname, '../output'));
}

// create express server for /output
const app = express();
app.use('/output', express.static(path.join(__dirname, '../output')));

// if img not found, don't return 404, keep waiting until the img is generated
app.use((req, res, next) => {
    res.set('Cache-Control', 'public, max-age=0');
    next();
});

// start express server
app.listen(env.serverPort, () => {
    log('info', 'Server', 'Server started', { url: `http://localhost:${env.serverPort}` });
});

// redis
const redis = createClient({
    url: env.redis,
});

redis.on('error', (err: any) => log('error', 'Redis', 'Redis error', { error: err }));

redis.connect();

const bot = new Bot(env.botToken);

bot.command(['start', 'help', 'about', 'settings'], async (ctx) => {
    const params = ctx.message!.text?.split(' ')[1]?.split('_');
    if (!params || params.length < 1) {
        ctx.reply(`👋 你好。我可以为您生成 Bilibili 视频的基本信息。

<b>使用方法</b>
<blockquote>1. 在我所在群组或和我的私信中发送 Bilibili 视频链接或 AV/BV 号，我会向您发送视频信息。
2. 在任意对话输入框中输入 <code>@${ctx.me.username}</code> 再输入 Bilibili 视频链接或 AV/BV 号，稍候即可选择发送视频信息。</blockquote>

<b>关于机器人</b>
<blockquote>版本 <code>${version}</code>
获取源代码 <code>${repository.url}</code>，<code>${license}</code> 许可证
<a href="${homepage}">了解更多</a></blockquote>`, {
            parse_mode: 'HTML',
            reply_parameters: {
                message_id: ctx.message!.message_id,
                allow_sending_without_reply: true,
            },
            reply_markup: new InlineKeyboard().switchInlineCurrent('开始使用'),
        });
        return;
    }
    const matched = match(params?.[0]);
    if (matched) {
        const info = await generate(matched.type, matched.id, params?.[1]);
        ctx.reply(info.text, {
            parse_mode: 'HTML',
            link_preview_options: {
                url: info.picture,
                prefer_large_media: true,
                show_above_text: true,
            },
        });
    }
});

bot.command('privacy', (ctx) => {
    ctx.reply('此机器人直接与 Bilibili 服务器通信。此机器人不会存储任何与您关联的数据。', {
        reply_parameters: {
            message_id: ctx.message?.message_id ?? 0,
            allow_sending_without_reply: true,
        },
    });
});

bot.on('message:text', async (ctx) => {
    if (ctx.message.via_bot?.id === ctx.me.id) return;
    if (ctx.message.forward_origin?.type === 'user' && ctx.message.forward_origin?.sender_user?.id === ctx.me.id) return;
    // check if message has bilibili link
    let text = ctx.message.text ?? ctx.message.caption;
    if (!text) return;

    // remove bot commands
    ctx.message.entities?.forEach((entity) => {
        if (entity.type === 'bot_command') {
            text = text.replace(ctx.message.text?.substring(entity.offset, entity.offset + entity.length), '');
        }
    });

    // find bilibili link
    const matched = match(text);
    if (!matched) return;

    // get video info
    const info = await generate(matched.type, matched.id);
    ctx.reply(info.text, {
        reply_parameters: {
            message_id: ctx.message.message_id,
            allow_sending_without_reply: true,
        },
        parse_mode: 'HTML',
        link_preview_options: {
            url: info.picture,
            prefer_large_media: true,
            show_above_text: true,
        },
    });
});

bot.on('inline_query', async (ctx) => {
    // check if message has bilibili link
    const text = ctx.inlineQuery.query;
    if (!text) return;
    // find bilibili link
    const matched = match(text);
    if (!matched) return;

    // get video info
    const info = await generate(matched.type, matched.id);
    ctx.answerInlineQuery([{
        type: 'article',
        id: '0',
        title: info.title ?? '获取失败',
        description: '发送视频信息',
        thumbnail_url: info.thumbnail,
        input_message_content: {
            message_text: info.text,
            parse_mode: 'HTML',
            link_preview_options: {
                url: info.picture,
                prefer_large_media: true,
                show_above_text: true,
            },
        },
    }]);
});

bot.start({
    allowed_updates: ['message', 'inline_query'],
});

// delete old files
const maxCacheDate = 30 * 60 * 1000;
setInterval(() => {
    fs.readdir(path.join(__dirname, '../output'), (err, files) => {
        if (err) return;
        files.forEach((file) => {
            fs.stat(path.join(__dirname, '../output', file), (err2, stats) => {
                if (err2) return;
                if (Date.now() - stats.mtimeMs > maxCacheDate) {
                    fs.unlink(path.join(__dirname, '../output', file), () => { });
                }
            });
        });
    });
}, maxCacheDate);

export default bot;
export { app, redis };
