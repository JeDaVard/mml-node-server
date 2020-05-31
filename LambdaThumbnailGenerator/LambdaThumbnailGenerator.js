process.env.PATH = process.env.PATH + ':' + process.env['LAMBDA_TASK_ROOT'];

const AWS = require('aws-sdk');
const { spawn, spawnSync } = require('child_process');
const { createReadStream, createWriteStream } = require('fs');
const { request } = require('http');

const s3 = new AWS.S3();
const ffprobePath = '/opt/nodejs/ffprobe';
const ffmpegPath = '/opt/nodejs/ffmpeg';
const allowedTypes = ['mov', 'mpg', 'mpeg', 'mp4', 'wmv', 'avi', 'webm'];
const width = process.env.WIDTH;
const height = process.env.HEIGHT;
const httpOptions = {
    hostname: process.env.SERVER_HOSTNAME,
    path: process.env.SERVER_PATH,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

module.exports.handler = async (event, context) => {
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key).replace(/\+/g, ' ');
    const bucket = event.Records[0].s3.bucket.name;
    const target = s3.getSignedUrl('getObject', { Bucket: bucket, Key: srcKey, Expires: 1000 });
    let fileType = srcKey.match(/\.\w+$/);

    if (!fileType) {
        throw new Error(`invalid file type found for key: ${srcKey}`);
    }

    fileType = fileType[0].slice(1);

    if (allowedTypes.indexOf(fileType) === -1) {
        throw new Error(`filetype: ${fileType} is not an allowed type`);
    }

    function createFfmpegParams(seek) {
        if(seek) {
            return  [
                '-ss',
                seek,
                '-i',
                target,
                '-vf',
                `thumbnail,scale=${width}:${height}`,
                '-qscale:v',
                '2',
                '-frames:v',
                '1',
                '-f',
                'image2',
                '-c:v',
                'mjpeg',
                'pipe:1'
            ];
        } else {
            return [
                '-y',
                '-ss',
                5,
                '-t',
                3,
                '-i',
                target,
                '-filter_complex',
                'fps=10,scale=320:-1:flags=lanczos,split [o1] [o2];[o1] palettegen [p]; [o2] fifo [o3];[o3] [p] paletteuse',
                '-f',
                'gif',
                'pipe:1'
            ];
        }
    }

    function createImage(type,seek) {
        return new Promise((resolve, reject) => {
            let tmpFile = createWriteStream(`/tmp/screenshot.${type}`);
            const ffmpeg = spawn(ffmpegPath,createFfmpegParams(seek));

            ffmpeg.stdout.pipe(tmpFile);

            ffmpeg.on('close', function(code) {
                tmpFile.end();
                resolve();
            });

            ffmpeg.on('error', function(err) {
                console.log(err);
                reject();
            });
        });
    }

    function uploadToS3(x, type) {
        return new Promise((resolve, reject) => {
            let tmpFile = createReadStream(`/tmp/screenshot.${type}`);
            let dstKey = srcKey.replace(/\.\w+$/, `_thumb${x}.${type}`);

            var params = {
                Bucket: bucket,
                Key: dstKey,
                Body: tmpFile,
                ContentType: `image/${type}`
            };

            s3.upload(params, function(err, data) {
                if (err) {
                    console.log(err);
                    reject();
                }
                console.log(`successful upload to ${bucket}/${dstKey}`);
                resolve();
            });
        });
    }

    const ffprobe = spawnSync(ffprobePath, [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=nw=1:nk=1',
        target
    ]);

    const duration = Math.ceil(ffprobe.stdout.toString());

    const req = request(httpOptions, res => {
        res.on('end', () => console.log(`video duration of ' posted to endpoint`));
    });
    req.write(JSON.stringify({ srcKey, duration }));
    req.end();

    await createImage('jpg',duration * 0.01);
    await uploadToS3(1, 'jpg');
    // await createImage('gif', false)
    // await uploadToS3('preview','gif')

    return console.log(`processed ${bucket}/${srcKey} successfully`);
};