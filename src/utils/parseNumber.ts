export default function parseNumber(num: number | string): string {
    let number = num;

    if (typeof number === 'string') {
        number = parseInt(number, 10);
    }
    if (number > 1000000) {
        return `${(number / 1000000).toFixed(0)}M`;
    }
    if (number > 1000) {
        const k = (number / 1000).toFixed(2).toString();
        if (k.endsWith('.00')) {
            return `${k.slice(0, -3)}k`;
        } if (k.endsWith('0')) {
            return `${k.slice(0, -1)}k`;
        }
        return `${k}k`;
    }

    return number.toString();
}
