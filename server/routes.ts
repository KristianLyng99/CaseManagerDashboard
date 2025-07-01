import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeSalaryImage } from "./anthropic";
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to analyze salary images
  app.post('/api/analyze-salary-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Convert buffer to base64
      const base64Image = req.file.buffer.toString('base64');
      
      // Analyze the image using Anthropic
      const salaryData = await analyzeSalaryImage(base64Image);
      
      res.json({ success: true, data: salaryData });
    } catch (error) {
      console.error('Error processing salary image:', error);
      res.status(500).json({ 
        error: 'Failed to process image', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
