"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize = new sequelize_1.Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    dialect: 'postgres',
    logging: console.log // Active les logs pour voir les requêtes SQL
});
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connexion PostgreSQL réussie');
        // FORCER la synchronisation des modèles
        // { alter: true } va créer/modifier les tables existantes
        await sequelize.sync({ alter: true });
        console.log('✅ Tables synchronisées avec la base de données');
    }
    catch (error) {
        console.error('❌ Erreur de connexion:', error);
        throw error;
    }
};
exports.testConnection = testConnection;
exports.default = sequelize;
