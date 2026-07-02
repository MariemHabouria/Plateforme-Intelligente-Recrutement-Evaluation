import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection } from './config/database';
import { startRelanceJobs } from './jobs/relanceJob';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/user.routes';
import demandeRoutes from './routes/demandeRoutes';
import adminRoutes from './routes/adminRoutes';
import directionRoutes from './routes/directionRoutes';
import offreRoutes from './routes/offreRoutes';
import candidatureRoutes from './routes/candidatureRoutes';
import entretienRoutes from './routes/entretienRoutes';
import publicEntretienRoutes from './routes/publicEntretien.routes';
import matchingInverseRoutes from './routes/matchingInverseRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import evaluationRoutes from './routes/evaluationPERoutes';
import contratRoutes from './routes/contratRoutes';
import { uploadCV, uploadMiddleware } from './controllers/uploadController';

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
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Non autorise par CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(morgan('dev'));

// Force UTF-8 sur toutes les reponses JSON
app.use((req, res, next) => {
    res.charset = 'utf-8';
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (CVs uploades)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes publiques (SANS auth JWT — accessibles via lien token, ex: self-scheduling candidat)
app.use('/api/public/entretiens', publicEntretienRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/demandes', demandeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/directions', directionRoutes);
app.use('/api/offres', offreRoutes);
app.use('/api/candidatures', candidatureRoutes);
app.use('/api/entretiens', entretienRoutes);
app.use('/api/matching-inverse', matchingInverseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/contrats', contratRoutes);

// Upload CV
app.post('/api/upload/cv', uploadMiddleware, uploadCV);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Serveur operationnel',
        timestamp: new Date().toISOString()
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvee'
    });
});

// Demarrage du serveur
const startServer = async () => {
    try {
        await testConnection();

        app.listen(PORT, () => {
            console.log('Serveur demarre sur http://localhost:' + PORT);
            console.log('Environnement: ' + process.env.NODE_ENV);
            console.log('Frontend: ' + process.env.FRONTEND_URL);
            console.log('CORS accepte: ' + allowedOrigins.join(', '));
        });
    } catch (error) {
        console.error('Erreur au demarrage:', error);
        process.exit(1);
    }
    startRelanceJobs();
};

startServer();