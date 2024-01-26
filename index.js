const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const dotenv = require('dotenv');
const compression = require('compression');
const cors = require('cors');
const { exec } = require('child_process');
const { spawn } = require('child_process');
const sharp = require('sharp')
const path = require('path')
const PORT = 5000


const app = express();
const upload = multer();

dotenv.config();

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIA2UC27YYUP5RYPAEC',
    secretAccessKey: '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',
  },
});

const corsOptions = {
  origin: ['*'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(compression());

app.get('/', (req, res) => {
  res.send("Hi, welcome");
});

// Random string generation
const generateRandomString = () => {
  return crypto.randomBytes(15).toString('hex');
};

// File upload route
app.post('/upload/:folderName', upload.array('documents'), async (req, res) => {
  try {
    const folderName = req.params.folderName;

    // Validate the number of files
    const maxFiles = 10;
    if (req.files.length > maxFiles) {
      return res.status(400).json({ error: 'Exceeded maximum number of files' });
    }

    const uploads = req.files.map(async (file) => {
      const randomString = generateRandomString();
      const extname = path.extname(file.originalname).toLowerCase();
      const newFileName = `${randomString}${extname}`;

      if (file.size <= 1024 * 1024) {
        // If the file is 1 MB or smaller, store it directly
        const uploadParams = {
          Bucket: 'aks-storage',
          Key: `${folderName}/${newFileName}`,
          Body: file.buffer,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));
      } else {
        // If the file is larger than 1 MB, compress it
        let compressedBuffer;
        if (['.jpg', '.jpeg', '.png'].includes(extname)) {
          // Compress image using sharp
          compressedBuffer = await compressImage(file.buffer);
        } else if (extname === '.pdf') {
          // Compress PDF using Ghostscript
          compressedBuffer = await compressFileWithGhostscript(file.buffer);
        }

        // Upload compressed file to S3
        const compressedParams = {
          Bucket: 'aks-storage',
          Key: `${folderName}/${newFileName}`,
          Body: compressedBuffer,
        };

        await s3Client.send(new PutObjectCommand(compressedParams));
      }

      return { filename: newFileName, status: 'uploaded' };
    });

    const results = await Promise.all(uploads);

    res.json({ files: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Compression function using Ghostscript with buffers
async function compressFileWithGhostscript(buffer) {
  return new Promise((resolve, reject) => {
    const ghostscriptCommand = 'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe';


    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-sOutputFile=-',
      '-'
    ];

    const process = spawn(ghostscriptCommand, args);

    process.stdin.write(buffer);
    process.stdin.end();

    let compressedBuffer = Buffer.from('');

    process.stdout.on('data', (data) => {
      compressedBuffer = Buffer.concat([compressedBuffer, data]);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(compressedBuffer);
      } else {
        reject(new Error(`Ghostscript process exited with code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

// Compression function using sharp for images
async function compressImage(buffer) {
  return sharp(buffer)
    .jpeg({ quality: 80, force: false })
    .toBuffer();
}

app.listen(PORT, () => {
  console.log(`The app is running on http://localhost:${PORT}`);
});
