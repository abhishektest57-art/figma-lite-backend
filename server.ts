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
  'http://localhost:5173',              // local dev
  'https://figma-lite.netlify.app'      // production frontend
];

app.use(express.json());
app.use(cors({
  origin: allowedOrigins, // update this if needed for frontend
  credentials: true
}));

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
    httpServer.listen(PORT, () => {
      console.log(`Server running with Socket.io at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
  });

// Placeholder for future centralized logger and error handling middleware
