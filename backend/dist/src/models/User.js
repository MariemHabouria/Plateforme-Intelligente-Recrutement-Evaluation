"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const bcrypt_1 = __importDefault(require("bcrypt"));
// Définition des rôles disponibles
exports.ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    MANAGER: 'MANAGER',
    DIRECTEUR: 'DIRECTEUR',
    DRH: 'DRH',
    DAF: 'DAF',
    DGA: 'DGA',
    DG: 'DG',
    RESP_PAIE: 'RESP_PAIE'
};
class User extends sequelize_1.Model {
    async comparePassword(candidatePassword) {
        return bcrypt_1.default.compare(candidatePassword, this.password);
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    nom: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    prenom: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: sequelize_1.DataTypes.STRING, // ← CHANGÉ de ENUM à STRING
        allowNull: false,
        defaultValue: 'MANAGER',
        validate: {
            isIn: [Object.values(exports.ROLES)] // Validation côté application
        }
    },
    departement: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    poste: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    telephone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    actif: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true
    },
    dernierConnexion: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    createdById: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' }
    }
}, {
    sequelize: database_1.default,
    modelName: 'User',
    tableName: 'users',
    paranoid: true,
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt_1.default.genSalt(10);
                user.password = await bcrypt_1.default.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt_1.default.genSalt(10);
                user.password = await bcrypt_1.default.hash(user.password, salt);
            }
        }
    }
});
exports.default = User;
