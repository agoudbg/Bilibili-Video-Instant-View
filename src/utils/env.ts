import dotenv from 'dotenv';

dotenv.config();

const env = {
    botToken: process.env.BOT_TOKEN as string,
    isDebugMode: process.env.DEBUG_MODE?.toLocaleLowerCase() === 'true',
    serverPort: parseInt(process.env.SERVER_PORT ?? '5092', 10),
    publicUrl: process.env.PUBLIC_URL as string,
    redis: process.env.REDIS_URL as string,
};

export default env;
