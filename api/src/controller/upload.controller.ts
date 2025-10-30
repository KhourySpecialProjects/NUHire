// src/controllers/upload.controller.ts

import { Request, Response } from 'express';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export class UploadController {
  uploadFile = (req: MulterRequest, res: Response): void => {
    console.log('File received:', req.file);
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    res.json({ filePath: `${req.file.path}` });
  };

  uploadResume = (req: MulterRequest, res: Response): void => {
    console.log('File received:', req.file);
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    res.json({ filePath: `${req.file.path}` });
  };

  uploadJob = (req: MulterRequest, res: Response): void => {
    console.log('File received:', req.file);
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    res.json({ filePath: `${req.file.path}` });
  };
}