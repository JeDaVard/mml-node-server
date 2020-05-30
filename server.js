const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });

const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');

const videoAPI = require('./api/video');

const app = express();

// Multer module for handling multi part file upload.
const storage = multer.diskStorage({
    destination: './files',
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            if (err) return cb(err)

            cb(null, raw.toString('hex') + path.extname(file.originalname))
        })
    }
})

// app.use((req, res, next) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     next()
// })

// Middleware
app.use(express.urlencoded({extended: true}))
app.use(express.json());
app.use(cors());

// Routes
app.use(express.static(path.join(__dirname, 'static')));
app.use(multer({ storage: storage }).single('file'));
app.use('/api/videos', videoAPI);


mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('Database is connected...');
        app.listen(process.env.PORT, () => {
            console.log(
                `Server is up on ${process.env.PORT}`
            );
        });
    })
    .catch((e) => {
        console.log(e);
    });