import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/cv';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

export const uploadCV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier' });
    }
    
    const cvUrl = `/uploads/cv/${req.file.filename}`;
    
    res.json({
      success: true,
      cvUrl,
      message: 'CV uploadé avec succès'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur upload' });
  }
};

export const uploadMiddleware = upload.single('cv');