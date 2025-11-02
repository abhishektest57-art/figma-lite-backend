// services/DesignService.ts
import { Request, Response } from 'express';
import { Design } from '../models/Design';
import { Types } from 'mongoose';

export class DesignService {
  // GET /api/designs
  static async getAll(_req: Request, res: Response) {
    try {
      const designs = await Design.find({}, 'title updatedAt thumbnail')
        .sort({ updatedAt: -1 })
        .lean();
      res.json({ data: designs });
    } catch (err: any) {
      res.status(500).json({ code: 'DB_ERROR', message: err.message });
    }
  }

  // GET /api/designs/:id
  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    
    // ---------- FIX: Log + lenient validation ----------
    console.log('getById called with ID:', id, 'Valid?', Types.ObjectId.isValid(id));
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        code: 'INVALID_ID', 
        message: `Invalid design id: ${id} (must be 24 hex chars)` 
      });
    }

    try {
      const design = await Design.findById(id).populate('comments.user', 'name email avatar')
      if (!design) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Design not found' });
      }
      res.json({ data: design });
    } catch (err: any) {
      console.error('getById error:', err);
      res.status(500).json({ code: 'DB_ERROR', message: err.message });
    }
  }

  // POST /api/designs
  static async create(req: Request, res: Response) {
    try {
      const { title, owner = 'anonymous', canvas = { version: '5.3.0', objects: [] } } = req.body;
      const design = new Design({ title, owner, canvas });
      await design.save();
      res.status(201).json({ data: design });
    } catch (err: any) {
      res.status(400).json({ code: 'CREATE_FAILED', message: err.message });
    }
  }

  // PUT /api/designs/:id   (full replace or partial patch)
  static async update(req: Request, res: Response) {
    const { id } = req.params;
    
    // ---------- FIX: Same validation + log ----------
    console.log('update called with ID:', id, 'Valid?', Types.ObjectId.isValid(id));
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        code: 'INVALID_ID', 
        message: `Invalid design id: ${id} (must be 24 hex chars)` 
      });
    }

    try {
      const design = await Design.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });
      if (!design) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Design not found' });
      }
      res.json({ data: design });
    } catch (err: any) {
      console.error('update error:', err);
      res.status(400).json({ code: 'UPDATE_FAILED', message: err.message });
    }
  }

  // DELETE /api/designs/:id
  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id))
      return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid design id' });

    try {
      const design = await Design.findByIdAndDelete(id);
      if (!design) return res.status(404).json({ code: 'NOT_FOUND', message: 'Design not found' });
      res.json({ message: 'Deleted' });
    } catch (err: any) {
      res.status(500).json({ code: 'DELETE_FAILED', message: err.message });
    }
  }
}