import { MessageEntity, ParseMode } from 'grammy/types';

import zeroWidthSpace from './zeroWidthSpace';

function get(entities: MessageEntity[]): object {
    // get the fake link
    const fakeLink = entities.find((entity) => entity.type === 'text_link' && entity.url?.includes('nmBotTextDatabase='));
    if (fakeLink === undefined) {
        return JSON.parse('{}');
    }
    // get the data from the fake link
    const data = (fakeLink as any).url!.split('nmBotTextDatabase=')[1];
    if (data === undefined) {
        return JSON.parse('{}');
    }
    // parse the data to JSON
    return JSON.parse(decodeURIComponent(data));
}

function set(data: object, parseMode: ParseMode, key?: string): string {
    // parse data to string
    const string = JSON.stringify(data, null, 0);
    // generate a fake link
    const parameter = encodeURIComponent(string);
    const fakeLink = `https://t.me/?${key ? 'encrypted&' : ''}nmBotTextDatabase=${parameter}`;
    // parse the fake link to the specified parse mode
    const fakeLinkText = zeroWidthSpace;
    switch (parseMode) {
        case 'HTML':
            return `<a href="${fakeLink}">${fakeLinkText}</a>`;
        case 'Markdown':
            return `[${fakeLinkText}](${fakeLink})`;
        case 'MarkdownV2':
            return `[${fakeLinkText}](${fakeLink})`;
        default:
            return fakeLink;
    }
}

export default {
    get,
    set,
};
