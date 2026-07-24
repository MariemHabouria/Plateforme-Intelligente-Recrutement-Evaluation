import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

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
import auditRoutes from './routes/auditRoutes';
import searchRoutes from './routes/search.routes';
dotenv.config();

const app: Application = express();

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
app.use('/api/search', searchRoutes);
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
app.use('/api/audit-logs', auditRoutes);

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

//  Plus de app.listen() ni de startServer() ici.
// app.ts ne fait QUE construire et exporter l'app Express.
// Le demarrage reel (listen + connexion DB + jobs) est dans server.ts.
// Ca permet aux tests (supertest) d'importer l'app sans ouvrir de vrai
// port, et evite les conflits EADDRINUSE quand plusieurs tests tournent.
export default app;