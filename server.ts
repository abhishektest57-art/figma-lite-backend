// backend/server.ts (Bootstrap Express/TS Backend)
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import designRoutes from './routes/designRoutes';
// import layerRoutes from './routes/layerRoutes';
// import commentRoutes from './routes/commentRoutes';
import { initSocketServer } from './sockets/SocketServer';

import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import userRoutes from './routes/userRoutes';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://figma-lite.netlify.app',
  'https://stalwart-fenglisu-aabfda.netlify.app'
];

app.use(express.json());

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log('❌ Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ✅ This must come *before* your routes
// app.options('/*', cors());
// app.options(/.*/, cors());

// Mounting REST routes
app.use('/api/designs', designRoutes);
app.use('/api/users', userRoutes);
app.use(errorHandler)

// Create HTTP server for Socket.io compatibility
const httpServer = createServer(app);

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/figma_like';
mongoose.connect(MONGO_URL, { dbName: 'figma_like' })
  .then(() => {
    console.log('MongoDB connected');
    // Start Socket.io after DB is up
    initSocketServer(httpServer);
    // ✅ Bind to all interfaces, not localhost
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running with Socket.io on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
  });

// Placeholder for future centralized logger and error handling middleware
