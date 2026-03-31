"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const relanceJob_1 = require("./jobs/relanceJob");
// Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const demandeRoutes_1 = __importDefault(require("./routes/demandeRoutes")); // ← AJOUTER
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes")); // ← AJOUTER
const direction_routes_1 = __importDefault(require("./routes/direction.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
    credentials: true
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', user_routes_1.default); // ← AJOUTER
app.use('/api/demandes', demandeRoutes_1.default); // ← AJOUTER
app.use('/api/admin', adminRoutes_1.default); // ← AJOUTER
app.use('/api/directions', direction_routes_1.default);
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
        await (0, database_1.testConnection)();
        app.listen(PORT, () => {
            console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
            console.log(`📝 Environnement: ${process.env.NODE_ENV}`);
            console.log(`🔗 Frontend: ${process.env.FRONTEND_URL}`);
        });
    }
    catch (error) {
        console.error('❌ Erreur au démarrage:', error);
        process.exit(1);
    }
    (0, relanceJob_1.startRelanceJobs)();
};
startServer();
