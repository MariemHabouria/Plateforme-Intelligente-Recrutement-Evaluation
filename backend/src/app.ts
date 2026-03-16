import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { testConnection } from './config/database';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/user.routes';  // ← AJOUTER

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
    credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);  // ← AJOUTER

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Serveur opérationnel',
        timestamp: new Date().toISOString()
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'Route non trouvée' 
    });
});

// Démarrage du serveur
const startServer = async () => {
    try {
        await testConnection();
        
        app.listen(PORT, () => {
            console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
            console.log(`📝 Environnement: ${process.env.NODE_ENV}`);
            console.log(`🔗 Frontend: ${process.env.FRONTEND_URL}`);
        });
    } catch (error) {
        console.error('❌ Erreur au démarrage:', error);
        process.exit(1);
    }
};

startServer();