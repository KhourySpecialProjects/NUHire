// src/controllers/upload.controller.ts

import { Request, Response } from 'express';

export class UploadController {
  uploadFile = (req: Request, res: Response): void => {
    console.log('File received:', req.file);
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    res.json({ filePath: `${req.file.path}` });
  };

  uploadResume = (req: Request, res: Response): void => {
    console.log('File received:', req.file);
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    res.json({ filePath: `${req.file.path}` });
  };

  uploadJob = (req: Request, res: Response): void => {
    console.log('File received:', req.file);
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    res.json({ filePath: `${req.file.path}` });
  };
}