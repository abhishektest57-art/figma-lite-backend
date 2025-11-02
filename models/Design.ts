// models/Design.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILayer {
  _id?: Types.ObjectId;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface IComment {
  _id?: Types.ObjectId;
  user: Types.ObjectId;     // ✅ link userId
  text: string;
  createdAt: Date;
  objectId?: string;
}

export interface IDesign extends Document {
  title: string;
  owner: string;
  canvas: any;
  layers: mongoose.Types.DocumentArray<ILayer & mongoose.Document>;
  comments: mongoose.Types.DocumentArray<IComment & mongoose.Document>;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}


const LayerSchema = new Schema<ILayer>(
  {
    name: { type: String, required: true },
    visible: { type: Boolean, default: true },
    locked: { type: Boolean, default: false },
  },
  { _id: true }
);

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // ✅ ref
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    objectId: { type: String },
  },
  { _id: true }
);

const DesignSchema = new Schema<IDesign>(
  {
    title: { type: String, required: true },
    owner: { type: String, required: true, default: 'anonymous' },
    canvas: { type: Schema.Types.Mixed, default: { version: '5.3.0', objects: [] } },
    layers: { type: [LayerSchema], default: [] },
    comments: { type: [CommentSchema], default: [] },
    thumbnail: { type: String },
  },
  { timestamps: true }
);

DesignSchema.index({ updatedAt: -1 });

export const Design = mongoose.model<IDesign>('Design', DesignSchema);