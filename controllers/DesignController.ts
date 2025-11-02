// controllers/DesignController.ts
import { Request, Response } from 'express';
import { DesignService } from '../services/DesignService';

export class DesignController {
  static getAll = DesignService.getAll;
  static getById = DesignService.getById;
  static create = DesignService.create;
  static update = DesignService.update;
  static delete = DesignService.delete;
}