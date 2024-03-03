const matchRegs: {
    reg: RegExp,
    type: 'aid' | 'bvid' | 'b23',
}[] = [{
    reg: /https:\/\/www.bilibili.com\/video\/av(\d+)/,
    type: 'aid',
},
{
    reg: /https:\/\/www.bilibili.com\/video\/(BV\w+)/,
    type: 'bvid',
},
{
    reg: /https:\/\/b23.tv\/(\w+)/,
    type: 'b23',
},
{
    reg: /av(\d+)/,
    type: 'aid',
},
{
    reg: /BV(\w+)/,
    type: 'bvid',
}];

export function match(text: string): { type: 'aid' | 'bvid' | 'b23', id: string } | undefined {
    let matched: { type: 'aid' | 'bvid' | 'b23', id: string } | undefined;
    matchRegs.forEach(({ reg, type }) => {
        if (!matched) {
            const m = text.match(reg);
            if (m) {
                matched = { type, id: m[1] };
            }
        }
    });
    return matched;
}
