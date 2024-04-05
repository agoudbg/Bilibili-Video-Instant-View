/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import canvas from '@napi-rs/canvas';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import bot, { redis } from '..';
import dateTime from './dateTime';
import env from './env';
import parseDuration from './parseDuration';
import parseNumber from './parseNumber';
import xssStringify from './xssStringify';

canvas.GlobalFonts.registerFromPath(path.join(__dirname, '../fonts', 'MiSans-Medium.otf'), 'MiSans');
canvas.GlobalFonts.registerFromPath(path.join(__dirname, '../fonts', 'AppleColorEmoji@2x.ttf'), 'AppleEmoji');

export async function generate(type: 'aid' | 'bvid' | 'b23', id: string, advanced?: string) {
    const advancedRequirements = advanced ? advanced.split(',') : [];
    let isFromCache = false;
    let aidP;
    let bvidP;
    let header: string = '';
    let content: string = '';
    if (type === 'aid') {
        aidP = id;
    } else if (type === 'bvid') {
        bvidP = id;
    } else if (type === 'b23') {
        // if is b23.tv
        // get real url
        const res = await axios.get(`https://b23.tv/${id}`);
        const realUrl = res.request.res.responseUrl;
        const bvidMatch = realUrl.match(/BV(\w+)/);
        bvidP = bvidMatch ? bvidMatch[1] : '';
    }
    if (!aidP && !bvidP) {
        return {
            text: '无法获取视频 ID',
        };
    }
    let res;
    // if redis has the data
    const redisKey = `bilibili:${aidP ? `av${aidP}` : `BV${bvidP}`}`;
    const redisData = await redis.get(redisKey);
    if (redisData) {
        res = JSON.parse(redisData);
        isFromCache = true;
    } else {
        res = await axios.get(`https://api.bilibili.com/x/web-interface/view/detail?${aidP ? `aid=${aidP}` : `bvid=${bvidP}`}`);

        // code
        switch (res.data.code) {
            case 0:
                break;
            case -400:
                return {
                    text: '请求错误',
                };
            case -403:
                return {
                    text: '权限不足',
                };
            case -404:
                return {
                    text: '无视频',
                };
            case 62002:
                return {
                    text: '稿件不可见',
                };
            case 62004:
                return {
                    text: '稿件审核中',
                };
            default:
                return {
                    text: '未知错误',
                };
        }
    }

    console.log(res);

    const { data } = res.data;

    console.log(data);
    const { View } = data;
    const {
        aid, bvid, videos, copyright, pic, title, pubdate, desc, duration, owner, staff, pages,
    } = View;
    const { mid, name } = owner;
    const {
        view, danmaku, reply, favorite, coin, share, like,
    } = View.stat;

    const { replies } = data.Reply;

    // parse numbers
    const viewStr = parseNumber(view);
    const danmakuStr = parseNumber(danmaku);
    const replyStr = parseNumber(reply);
    const favoriteStr = parseNumber(favorite);
    const coinStr = parseNumber(coin);
    const shareStr = parseNumber(share);
    const likeStr = parseNumber(like);

    // generate pic name
    const date = new Date().getTime();
    const picName = `av${aid}-${date}.png`;

    const redisSaveData = {
        data: {
            data,
        },
        code: 0,
        savedPic: picName,
    };

    // save to redis
    if (!redisData) {
        await redis.set(`bilibili:av${aid}`, JSON.stringify(redisSaveData), { EX: 1800 });
        await redis.set(`bilibili:${bvid}`, JSON.stringify(redisSaveData), { EX: 1800 });
    }

    // header
    header = `<b><a href="https://www.bilibili.com/video/${bvid}">${xssStringify(title, 'HTML')}</a></b>

<code>av${aid}</code> • <code>${bvid}</code>${pages.length > 1 ? ` • <a href="https://t.me/${bot.botInfo.username}?start=${bvid}_showPages">${pages.length} P</a>` : ''} • ${parseDuration(duration)}
`;

    // for pages
    if (advancedRequirements.includes('showPages')) {
        const pStr = pages.map((p: any) => `${p.page}. <a href="https://www.bilibili.com/video/${bvid}?p=${p.page}">${xssStringify(p.part, 'HTML')}</a> • ${parseDuration(p.duration)}`).join('\n');
        content = `
${pStr}

<a href="https://t.me/${bot.botInfo.username}?start=${bvid}">概要</a>`;
    } else {
        // staff
        let staffStr = '';
        if (staff) {
            staffStr = staff.map((s: any) => `<a href="https://space.bilibili.com/${s.mid}">${xssStringify(s.name, 'HTML')}</a>`).join('、');
        }
        staffStr = staffStr ? `${staffStr} 联合创作` : `<a href="https://space.bilibili.com/${mid}">${xssStringify(name, 'HTML')}</a>`;

        // description
        let descStr = '';
        if (desc) {
            // if desc > 8 lines / > 200 characters
            let descCut = desc.length > 200 ? `${desc.slice(0, 200)}...` : desc;
            if (descCut.split('\n').length > 5) {
                descCut = `${descCut.split('\n').slice(0, 5).join('\n')}...`;
            }

            if (descCut !== desc && !advancedRequirements.includes('fullDescription')) {
                descCut = `${xssStringify(descCut, 'HTML')}<a href="https://t.me/${bot.botInfo.username}?start=${bvid}_fullDescription">展开</a>`;
            } else {
                descCut = xssStringify(desc, 'HTML');
            }

            descStr = `<blockquote>${descCut}</blockquote>\n`;
        }

        content = `👤 ${staffStr}
📅 ${dateTime(new Date(pubdate * 1000))} 
${descStr}`;
    }

    const text = `${header}${content}`;

    let infoPicture = '';

    if (!isFromCache) {
        infoPicture = `${env.publicUrl}/output/${picName}`;
        try {
            // generate information picture
            // download & get the information of original picture
            const picRes = await axios.get(pic, {
                responseType: 'arraybuffer',
            });
            const picBuffer = Buffer.from(picRes.data, 'binary');
            let picCanvas: canvas.Image | canvas.Canvas = await canvas.loadImage(picBuffer);

            // get the information of template picture
            const template = fs.readFileSync(path.join(__dirname, '../img/template.png'));
            const templateCanvas = await canvas.loadImage(template);
            const templateWidth = templateCanvas.width;
            const templateHeight = templateCanvas.height;

            // pic canvas may have different size
            const picWidth = picCanvas.width;
            const picHeight = picCanvas.height;
            const picRatio = picWidth / picHeight;
            const templateRatio = templateWidth / templateHeight;

            // if so, cut the pic
            if (picRatio > templateRatio) {
                const newWidth = picHeight * templateRatio;
                const cutWidth = (picWidth - newWidth) / 2;
                const cutPicCanvas = canvas.createCanvas(newWidth, picHeight);
                const cutCtx = cutPicCanvas.getContext('2d');
                cutCtx.drawImage(picCanvas, -cutWidth, 0, picWidth, picHeight);
                picCanvas = cutPicCanvas;
            } else if (picRatio < templateRatio) {
                const newHeight = picWidth / templateRatio;
                const cutHeight = (picHeight - newHeight) / 2;
                const cutPicCanvas = canvas.createCanvas(picWidth, newHeight);
                const cutCtx = cutPicCanvas.getContext('2d');
                cutCtx.drawImage(picCanvas, 0, -cutHeight, picWidth, picHeight);
                picCanvas = cutPicCanvas;
            }

            // create a new canvas
            const newCanvas = canvas.createCanvas(templateWidth, templateHeight);
            const ctx = newCanvas.getContext('2d');
            ctx.drawImage(picCanvas, 0, 0, templateWidth, templateHeight);
            ctx.drawImage(templateCanvas, 0, 0, templateWidth, templateHeight);

            // set font
            ctx.font = '30px MiSans,AppleEmoji';
            ctx.fillStyle = '#fff';
            ctx.textBaseline = 'middle';

            // draw text
            const baseY = 0.93 * templateHeight;
            // draw likeNum
            ctx.fillText(likeStr, 0.212 * templateWidth, baseY);
            // draw coinNum
            ctx.fillText(coinStr, 0.365 * templateWidth, baseY);
            // draw favoriteNum
            ctx.fillText(favoriteStr, 0.518 * templateWidth, baseY);
            // draw viewNum
            ctx.fillText(viewStr, 0.673 * templateWidth, baseY);
            // draw danmakuNum
            ctx.fillText(danmakuStr, 0.828 * templateWidth, baseY);
            // draw bvid
            ctx.font = '14px MiSans,AppleEmoji';
            ctx.fillStyle = '#ffffff55';
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';
            ctx.fillText(`${bvid}\n${date}`, 0.01 * templateWidth, 0.01 * templateHeight);

            // set up's avatar
            const avatar = axios.get(owner.face, {
                responseType: 'arraybuffer',
            });
            const avatarBuffer = Buffer.from((await avatar).data, 'binary');
            const avatarCanvas = await canvas.loadImage(avatarBuffer);

            // convert to circle
            ctx.beginPath();
            ctx.arc((0.0345 * templateWidth) + (0.090 * templateHeight) / 2, 0.885 * templateHeight + (0.090 * templateHeight) / 2, (0.090 * templateHeight) / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarCanvas, 0.0340 * templateWidth, 0.885 * templateHeight, 0.090 * templateHeight, 0.090 * templateHeight);

            // save to file
            fs.writeFileSync(path.join(__dirname, `../../output/${picName}`), newCanvas.toBuffer('image/png'));
        } catch (e: any) {
            console.error(e?.stack);
        }
    } else {
        infoPicture = `${env.publicUrl}/output/${res.savedPic}`;
    }

    return {
        text,
        picture: infoPicture,
        thumbnail: pic,
        title,
    };
}
