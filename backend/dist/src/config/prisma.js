"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/config/prisma.ts - Version simplifiée
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const connectionString = process.env.DATABASE_URL;
// L'adapter crée le pool automatiquement
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;
