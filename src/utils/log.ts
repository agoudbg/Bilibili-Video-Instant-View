import env from '../utils/env';

const logLevels = {
    debug: {
        level: 0,
        color: '0',
    },
    info: {
        level: 1,
        color: '32',
    },
    warn: {
        level: 2,
        color: '33',
    },
    error: {
        level: 3,
        color: '31',
    },
};

export interface Log {
    logLevel: keyof typeof logLevels;
    moduleName: string;
    message: string;
    data?: { [key: string]: any };
    date: Date;
}

export function log(logLevel: keyof typeof logLevels, moduleName: string, message: string, data?: { [key: string]: any }) {
    const logLevelConfig = logLevels[logLevel];

    // ignore debug log in production
    if (logLevel === 'debug' && !env.isDebugMode) {
        return;
    }

    const date = new Date();

    // console.log if in debug mode
    console.log(`\x1b[1;${logLevelConfig.color}m${logLevel.toUpperCase()}\x1b[1;34m ${moduleName} \x1b[0;30m${date.toISOString()}\x1b[0m`, message, data);
}
