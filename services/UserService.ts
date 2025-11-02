// services/UserService.ts
import { Request, Response } from 'express';
import { User } from '../models/User';
import { Types } from 'mongoose';

export class UserService {
  static async getAll(_req: Request, res: Response) {
    try {
      const users = await User.find({}, 'name email role avatar updatedAt').sort({ updatedAt: -1 }).lean();
      res.json({ data: users });
    } catch (err: any) {
      res.status(500).json({ code: 'DB_ERROR', message: err.message });
    }
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id))
      return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid user id' });

    try {
      const user = await User.findById(id).lean();
      if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
      res.json({ data: user });
    } catch (err: any) {
      res.status(500).json({ code: 'DB_ERROR', message: err.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, email, passwordHash, avatar, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ code: 'EMAIL_EXISTS', message: 'Email already registered' });
      }

      const user = new User({ name, email, passwordHash, avatar, role });
      await user.save();
      res.status(201).json({ data: user });
    } catch (err: any) {
      res.status(400).json({ code: 'CREATE_FAILED', message: err.message });
    }
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id))
      return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid user id' });

    try {
      const user = await User.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
      res.json({ data: user });
    } catch (err: any) {
      res.status(400).json({ code: 'UPDATE_FAILED', message: err.message });
    }
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id))
      return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid user id' });

    try {
      const user = await User.findByIdAndDelete(id);
      if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
      res.json({ message: 'Deleted' });
    } catch (err: any) {
      res.status(500).json({ code: 'DELETE_FAILED', message: err.message });
    }
  }
}
