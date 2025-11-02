// controllers/UserController.ts
import { UserService } from '../services/UserService';

export class UserController {
  static getAll = UserService.getAll;
  static getById = UserService.getById;
  static create = UserService.create;
  static update = UserService.update;
  static delete = UserService.delete;
}
