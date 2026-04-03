"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("prisma/config");
require("dotenv/config");
exports.default = (0, config_1.defineConfig)({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'npx ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
    },
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
