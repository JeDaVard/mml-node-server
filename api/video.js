const express = require('express');
const videoController = require('../controllers/video')

const router = express.Router()

router.route('/')
    .get(videoController.getVideos)
    .put(videoController.postVideo)

module.exports = router;