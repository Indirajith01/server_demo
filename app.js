import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MongoClient } from 'mongodb';
import moment from 'moment';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Replace with your Firebase config
const firebaseConfig = {
   apiKey : "AIzaSyDpzt-LWl8Sssgbc4wDiIXHBjZLr2maycM",
   authDomain : "doument-upload.firebaseapp.com",
   projectId : "doument-upload",
   storageBucket : "gs://doument-upload.appspot.com",
   messagingSenderId : "81473254131",
   appId : "1:81473254131:web:bbda4242473e8f0a2e3d86",
   measurementId : "G-8K32W71QMY"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

// MongoDB Connection URL
const mongoURL = 'mongodb://127.0.0.1:27017';
const dbName = 'documents';

app.use(express.static('public'));

const upload = multer({
  limits: {
    fileSize: 3 * 1024 * 1024, 
  },
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/document.html'));
});


app.post('/upload', upload.fields([
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'form16', maxCount: 1 },
  { name: 'annualinfostmt', maxCount: 1 },
  { name: 'detailsofforeignassets', maxCount: 1 },
  { name: 'form26as', maxCount: 1 }
]), async (req, res) => {
  const { aadhar, pan, form16, annualinfostmt, detailsofforeignassets, form26as } = req.files;

  try {

    if (!checkFileSize(aadhar) || !checkFileSize(pan) || !checkFileSize(form16) || !checkFileSize(annualinfostmt) || !checkFileSize(detailsofforeignassets) || !checkFileSize(form26as)) {
      return res.status(400).json({ error: 'File size exceeds the limit' });
    }
    const urls = await Promise.all([
      uploadAndReturnUrl(`aadhar/${uuidv4()}-${aadhar[0].originalname}`, aadhar[0]),
      uploadAndReturnUrl(`pan/${uuidv4()}-${pan[0].originalname}`, pan[0]),
      uploadAndReturnUrl(`form16/${uuidv4()}-${form16[0].originalname}`, form16[0]),
      uploadAndReturnUrl(`annualinfostmt/${uuidv4()}-${annualinfostmt[0].originalname}`, annualinfostmt[0]),
      uploadAndReturnUrl(`detailsofforeignassets/${uuidv4()}-${detailsofforeignassets[0].originalname}`, detailsofforeignassets[0]),
      uploadAndReturnUrl(`form26as/${uuidv4()}-${form26as[0].originalname}`, form26as[0]),
    ]);

    await storeUrlsInMongo({
      userId: uuidv4(),
      urls,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
    });

    res.send('Files uploaded successfully!');
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function checkFileSize(file) {
  // Check if the file exists and its size is within the limit
  return file && file[0].size <= 3 * 1024 * 1024; // Adjust the limit as needed
}

async function uploadAndReturnUrl(filePath, file) {
  const fileRef = ref(storage, filePath);

  const metadata = {
    contentType: 'application/pdf',
    metadata: {
      custom: 'metadata'
    }
  };

  await uploadBytes(fileRef, file.buffer, metadata);
  console.log(`${fileRef.fullPath} uploaded successfully!`);

  return getDownloadURL(fileRef);
}

async function storeUrlsInMongo(userDocument) {
  const client = new MongoClient(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('documents');
    await collection.insertOne(userDocument);
    console.log('Stored URLs in MongoDB for user:', userDocument.userId);
  } finally {
    await client.close();
  }
}


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
