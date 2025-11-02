import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { Design } from '../models/Design';
import { Types } from 'mongoose';

type HashMap = Map<string, string>;
type TimerMap = Map<string, NodeJS.Timeout>;

// djb2 hash -> base36 string
function hashString(s: string) {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(36);
}

export function initSocketServer(httpServer: HttpServer) {
  const io = new IOServer(httpServer, {
    cors: { origin: 'http://localhost:5173', credentials: true },
  });

  // In-memory last-known canvas hash per design (room). If you run multiple server
  // instances, move this to shared storage (Redis).
  const lastCanvasHashByDesign: HashMap = new Map();
  const saveTimers: TimerMap = new Map();
  const SAVE_DEBOUNCE_MS = 800; // debounce DB writes per-design
  // Map<room, Map<socket.id, userObject>>
  const activeUsersByRoom: Record<string, Record<string, any>> = {};

  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    const broadcast = (event: string, data: any, room?: string) => {
      if (room) io.to(room).emit(event, data);
      else socket.broadcast.emit(event, data);
    };

    // ---------- JOIN ----------
    socket.on('design:join', async ({ designId }) => {
      const room = `design:${designId}`;
      socket.join(room);
      console.log(`${socket.id} joined ${room}`);

      try {
        const design = await Design.findById(designId).populate({
          path: 'comments.user',
          select: 'name email avatar', // include only safe user fields
        }).lean();
        if (design) {
          // initialize lastCanvasHash for this design so server can ignore duplicates
          try {
            const serialized = JSON.stringify(design.canvas || {});
            const h = hashString(serialized);
            lastCanvasHashByDesign.set(designId, h);
          } catch (e) { /* ignore */ }

          socket.emit('design:load', design);
        }
      } catch (e) {
        socket.emit('error', { code: 'LOAD_FAILED', message: 'Cannot load design' });
      }
    });

    // ---------- LAYER EVENTS (unchanged but broadcasting via helper) ----------
    socket.on('layer:add', async ({ designId, layer }) => {
      const room = `design:${designId}`;
      try {
        const design = await Design.findById(designId);
        if (!design) return;

        design.layers.push(layer);
        await design.save();

        const added = design.layers[design.layers.length - 1];
        broadcast('layer:added', { layer: added }, room);
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('layer:delete', async ({ designId, layerId }) => {
      const room = `design:${designId}`;
      try {
        const design = await Design.findById(designId);
        if (!design) return;

        design.layers.pull(layerId);
        await design.save();

        broadcast('layer:deleted', { layerId }, room);
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('layer:update', async ({ designId, layerId, updates }) => {
      const room = `design:${designId}`;
      try {
        const design = await Design.findById(designId);
        if (!design) return;
        const layer = design.layers.id(layerId);
        if (!layer) return;

        Object.assign(layer, updates);
        await design.save();
        broadcast('layers:replace', { layers: design.layers }, room);
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('layers:reorder', async ({ designId, layers }) => {
      const room = `design:${designId}`;
      try {
        await Design.updateOne({ _id: designId }, { $set: { layers } });
        broadcast('layers:replace', { layers }, room);
      } catch (e) {
        console.error(e);
      }
    });

    // ---------- SINGLE OBJECT ADD ----------
    socket.on('canvas:object:add', async ({ designId, object }) => {
      const room = `design:${designId}`;
      // broadcast this object to others
      socket.to(room).emit('canvas:object:add', { object });

      // optional: update DB on next debounce cycle
      const existingTimer = saveTimers.get(designId);
      if (existingTimer) clearTimeout(existingTimer);
      const t = setTimeout(async () => {
        try {
          const design = await Design.findById(designId);
          if (!design) return;
          const json = design.canvas || {};
          json.objects = [...(json.objects || []), object];
          await Design.findByIdAndUpdate(designId, { canvas: json });
        } catch (e) {
          console.error('Failed to save object add:', e);
        } finally {
          saveTimers.delete(designId);
        }
      }, SAVE_DEBOUNCE_MS);
      saveTimers.set(designId, t);
    });


    // ---------- CANVAS (with hash dedup + debounced save) ----------
    socket.on('canvas:update', async ({ designId, canvas }) => {
      const room = `design:${designId}`;

      try {
        const serialized = JSON.stringify(canvas || {});
        const h = hashString(serialized);

        const last = lastCanvasHashByDesign.get(designId);
        if (last && last === h) {
          // identical — ignore to prevent thrash
          return;
        }

        // update in-memory hash
        lastCanvasHashByDesign.set(designId, h);

        // broadcast to others in room (exclude sender)
        // io.to(room).emit('canvas:update', { canvas });
        socket.to(room).emit('canvas:update', { canvas });


        // debounce DB save per design
        const existingTimer = saveTimers.get(designId);
        if (existingTimer) clearTimeout(existingTimer);

        const t = setTimeout(async () => {
          try {
            await Design.findByIdAndUpdate(designId, { canvas });
          } catch (e) {
            console.error('Failed to save canvas to DB:', e);
          } finally {
            saveTimers.delete(designId);
          }
        }, SAVE_DEBOUNCE_MS);

        saveTimers.set(designId, t);
      } catch (e) {
        console.error('Error handling canvas:update', e);
      }
    });

    // ---------- COLOR CHANGE ----------
    socket.on('canvas:colorChange', async ({ color, source, designId }) => {
      const room = `design:${designId}`;

      // ✅ Broadcast to everyone else in the same design room
      socket.to(room).emit('canvas:colorChange', { color, source: 'server' });

      // Optional: also persist color change in DB, if you want
      // but usually it's transient, and the next canvas:update handles it anyway
    });


    // ---------- COMMENT ----------
    socket.on('comment:add', async ({ designId, comment }) => {
      const room = `design:${designId}`;
      try {
        const design = await Design.findById(designId);
        if (!design) return;

        // comment = { userId, text }
        const fullComment = {
          user: comment.userId,
          text: comment.text,
          createdAt: new Date(),
        };

        design.comments.push(fullComment as any);
        await design.save();

        const populatedDesign = await Design.findById(designId)
          .populate('comments.user', 'name email avatar')
          .lean();

        // populate for broadcast (so frontend has user info)
        // const populated = await Design.populate(fullComment, { path: 'user', select: 'name email avatar' });

        const lastComment = populatedDesign?.comments[populatedDesign.comments.length - 1];

        io.to(room).emit('comment:added', { comment: lastComment });
      } catch (e) {
        console.error('Error adding comment:', e);
      }
    });

    // ---------- USER PRESENCE ----------
    socket.on('user:join', ({ user, designId }) => {
      const room = `design:${designId}`;
      socket.join(room);

      if (!activeUsersByRoom[room]) activeUsersByRoom[room] = {};
      activeUsersByRoom[room][socket.id] = user;

      console.log(`🟢 ${user.name} joined ${room}`);

      // Broadcast updated list
      const activeUsers = Object.values(activeUsersByRoom[room]);
      io.to(room).emit('user:list', activeUsers);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      // Clean up from all rooms
      for (const [room, users] of Object.entries(activeUsersByRoom)) {
        if (users[socket.id]) {
          const leftUser = users[socket.id];
          delete users[socket.id];
          console.log(`🔴 ${leftUser?.name || 'Unknown user'} left ${room}`);
          io.to(room).emit('user:list', Object.values(users));
        }
      }
    });
  });

  return io;
}
