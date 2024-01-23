import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import moment from 'moment';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const mongoURL = 'mongodb+srv://Indirajith:4wOaB1EOaikJJI9M@cluster0.m3xmsle.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'documents';
const bucketName = 'aks-storage'; 

AWS.config.update({
  accessKeyId: 'AKIA2UC27YYUP5RYPAEC',
  secretAccessKey: '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',
});

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
	origin: [
		"*",
	],
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	credentials: true, 
	optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.static('public'));

const s3 = new AWS.S3();

// Allowed file types
const allowedFileTypes = ['application/pdf'];

// File size in bytes
const MAX_FILE_SIZE = 3 * 1024 * 1024;

// Middleware to validate file type and size
const validateFile = (req, res, next) => {
  try {
    const fileTypes = ['aadhar', 'pan', 'form16', 'annualinfostmt', 'detailsofforeignassets', 'form26as'];

    fileTypes.forEach((fileType) => {
      const files = req.files[fileType];

      if (!files || !files[0]) {
        throw new Error(`No ${fileType} file found.`);
      }

      // Check file type
      if (!allowedFileTypes.includes(files[0].mimetype)) {
        throw new Error(`Invalid ${fileType} file type.`);
      }

      // Check file size
      if (files[0].size > MAX_FILE_SIZE) {
        throw new Error(`File size of ${fileType} exceeds the maximum limit.`);
      }
    });

    // If all validations pass, proceed to the next middleware
    next();
  } catch (error) {
    console.error('File validation error:', error);
    res.status(400).json({ error: error.message });
  }
};

app.get('/upload', (req,res)=>{
  res.sendFile(path.join(__dirname,'./public/document.html'))
})

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, './public/admin.html'));
});

app.get('/admin.js', (req, res) => {
  res.sendFile(path.join(__dirname, './public/admin.js'));
});

app.post('/upload', multer().fields ([
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'form16', maxCount: 1 },
  { name: 'annualinfostmt', maxCount: 1 },
  { name: 'detailsofforeignassets', maxCount: 1 },
  { name: 'form26as', maxCount: 1 },
]), validateFile , async(req,res) =>{
  try {
    // Check if files are present in the request
    if (!req.files) {
      throw new Error('No files found in the request.');
    }

    const { aadhar, pan, form16, annualinfostmt, detailsofforeignassets, form26as } = req.files;

    const uploadFileToS3 = async (file, fileType) => {
      const params = {
        Bucket: bucketName,
        Key: `${fileType}/${uuidv4()}-${file.originalname}`,
        Body: file.buffer,
      };

      const result = await s3.upload(params).promise();
      return result.Location;
    };

    const urls = await Promise.all([
      uploadFileToS3(aadhar[0], 'aadhar'),
      uploadFileToS3(pan[0], 'pan'),
      uploadFileToS3(form16[0], 'form16'),
      uploadFileToS3(annualinfostmt[0], 'annualinfostmt'),
      uploadFileToS3(detailsofforeignassets[0], 'detailsofforeignassets'),
      uploadFileToS3(form26as[0], 'form26as'),
    ]);

    await storeUrlsInMongo({
      userId: uuidv4(),
      urls,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    });

    res.send('Files uploaded successfully!');
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


async function storeUrlsInMongo(userDocument) {
  let client;

  try {
    client = new MongoClient(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('documents');
    await collection.insertOne(userDocument);
    console.log('Stored URLs in MongoDB for user:', userDocument.userId);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

app.get('/admin/documents', async (req, res) => {
  let client;

  try {
    client = new MongoClient(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('documents');
    const documents = await collection.find().toArray();

    if (documents.length === 0) {
      // Handle the case where no documents are found
      res.status(404).json({ error: 'No documents found' });
    } else {
      res.json(documents);
    }
  } catch (error) {
    console.error('Error fetching documents from MongoDB:', error);
    res.status(500).json({ err: 'Internal Server Error' ,error});
  } finally {
    if (client) {
      await client.close();
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
