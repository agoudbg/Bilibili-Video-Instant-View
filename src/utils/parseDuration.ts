export default function parseDuration(time: number) {
    const duration = time;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration - hours * 3600) / 60);
    const seconds = duration - hours * 3600 - minutes * 60;
    let result = '';
    if (hours) {
        result += `${hours}:`;
    }
    if (minutes < 10) {
        result += '0';
    }
    result += `${minutes}:`;
    if (seconds < 10) {
        result += '0';
    }
    result += seconds;
    return result;
}
