import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { startRelanceJobs } from './jobs/relanceJob';
// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/user.routes';  
import demandeRoutes from './routes/demandeRoutes';
import adminRoutes from './routes/adminRoutes';
import directionRoutes from './routes/directionRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;


const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
];

// Middlewares
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        // Permettre les requêtes sans origine (comme Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Non autorisé par CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/demandes', demandeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/directions', directionRoutes);

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
            console.log(` Serveur démarré sur http://localhost:${PORT}`);
            console.log(` Environnement: ${process.env.NODE_ENV}`);
            console.log(` Frontend: ${process.env.FRONTEND_URL}`);
            console.log(` CORS accepte: ${allowedOrigins.join(', ')}`);
        });
    } catch (error) {
        console.error('❌ Erreur au démarrage:', error);
        process.exit(1);
    }
    startRelanceJobs();
};

startServer();