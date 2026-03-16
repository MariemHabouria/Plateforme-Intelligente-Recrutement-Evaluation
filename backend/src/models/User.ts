import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

// Définition des rôles disponibles
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGER: 'MANAGER',
  DIRECTEUR: 'DIRECTEUR',
  DRH: 'DRH',
  DAF: 'DAF',
  DGA: 'DGA',
  DG: 'DG',
  RESP_PAIE: 'RESP_PAIE'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

interface UserAttributes {
  id: string;
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role: Role;
  departement?: string;
  poste?: string;
  telephone?: string;
  actif: boolean;
  dernierConnexion?: Date;
  createdById?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'actif' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public nom!: string;
  public prenom!: string;
  public role!: Role;
  public departement?: string;
  public poste?: string;
  public telephone?: string;
  public actif!: boolean;
  public dernierConnexion?: Date;
  public createdById?: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,  // ← CHANGÉ de ENUM à STRING
      allowNull: false,
      defaultValue: 'MANAGER',
      validate: {
        isIn: [Object.values(ROLES)]  // Validation côté application
      }
    },
    departement: {
      type: DataTypes.STRING,
      allowNull: true
    },
    poste: {
      type: DataTypes.STRING,
      allowNull: true
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    dernierConnexion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    paranoid: true,
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  }
);

export default User;