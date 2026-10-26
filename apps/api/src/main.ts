import 'reflect-metadata';
import { createApp } from './bootstrap.js';
import { loadConfigOrExit } from './config/env.js';

const config = loadConfigOrExit();
const app = await createApp(config);
await app.listen(config.PORT);
