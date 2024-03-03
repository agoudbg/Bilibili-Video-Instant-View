import { ParseMode } from 'grammy/types';

function xssStringify(text: string, parseMode: ParseMode): string {
    switch (parseMode) {
        case 'HTML':
            return text.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        case 'Markdown':
            return text.replace(/_/g, '\\_')
                .replace(/\*/g, '\\*')
                .replace(/`/g, '\\`')
                .replace(/\[/g, '\\[');
        case 'MarkdownV2':
            return text.replace(/_/g, '\\_')
                .replace(/\*/g, '\\*')
                .replace(/\[/g, '\\[')
                .replace(/\]/g, '\\]')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .replace(/~/g, '\\~')
                .replace(/`/g, '\\`')
                .replace(/>/g, '\\>')
                .replace(/#/g, '\\#')
                .replace(/\+/g, '\\+')
                .replace(/-/g, '\\-')
                .replace(/=/g, '\\=')
                .replace(/\|/g, '\\|')
                .replace(/\{/g, '\\{')
                .replace(/\}/g, '\\}');
        default:
            return text;
    }
}

export default xssStringify;
