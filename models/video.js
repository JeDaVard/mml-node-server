const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    link: {
        type: String,
        required: [true, 'video must have a link']
    }
}, {
    timestamps: true
})

const Video = mongoose.model('Video', videoSchema)

module.exports = Video;