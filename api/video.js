const express = require('express');
const videoController = require('../controllers/video')

const router = express.Router()

router.route('/')
    .get(videoController.getVideos)
    .post(videoController.postVideo)

module.exports = router;