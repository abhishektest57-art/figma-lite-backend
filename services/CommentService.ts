// CommentService handles comment data access
import { Request, Response } from 'express';

export class CommentService {
  static async getAll(req: Request, res: Response) {
    res.status(200).json({ message: 'List all comments (stub)' });
  }
  static async getById(req: Request, res: Response) {
    res.status(200).json({ message: `Get comment by id ${req.params.id} (stub)` });
  }
  static async create(req: Request, res: Response) {
    res.status(201).json({ message: 'Create comment (stub)' });
  }
  static async update(req: Request, res: Response) {
    res.status(200).json({ message: `Update comment by id ${req.params.id} (stub)` });
  }
  static async delete(req: Request, res: Response) {
    res.status(200).json({ message: `Delete comment by id ${req.params.id} (stub)` });
  }
}
