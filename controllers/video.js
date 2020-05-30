const Video = require("../models/video");
const awsSDK = require("aws-sdk");
// const awsCloudFront = require('aws-cloudfront-sign');
const fs = require("fs");

const getVideos = async (req, res) => {
  try {
    const videos = await Video.find();

    res.status(200).json({
      status: "success",
      data: videos,
    });
  } catch (e) {
    res.status(400).json({
      status: "failed",
      error: e,
      data: null,
    });
  }
};

const postVideo = async (req, res) => {
  try {
    const link = await uploadFile(req.file.originalname, req.file.path);

    await Video.create({
      link:
        "https://" +
        link.replace(process.env.BucketName + process.env.BUCKET_URL, process.env.CLOUDFRONT_URL),
    });

    const videos = await Video.find();

        res.status(200).json({
          status: "success",
          data: videos,
    });
  } catch (e) {
    res.status(400).json({
      status: "failed",
      error: e,
      data: null,
    });
  }
};

const uploadFile = (filename, fileDirectoryPath) => {
  awsSDK.config.update({
    accessKeyId: process.env.AWSAccessKeyId,
    secretAccessKey: process.env.AWSSecretKey,
  });
  const s3 = new awsSDK.S3();

  return new Promise(function (resolve, reject) {
    fs.readFile(fileDirectoryPath.toString(), function (err, data) {
      if (err) {
        reject(err);
      }

      const uploadToBucket = s3.putObject(
        {
          Bucket: process.env.BucketName,
          Key: filename,
          Body: data,
          ACL: "public-read",
          ContentType: "video/mp4",
        },
        function (err, data) {
          fs.unlink(fileDirectoryPath, (err) => {
            if (err) throw err;
            console.log(
              fileDirectoryPath +
                " was successfully removed from Node server..."
            );
          });

          if (err) reject(err);

          resolve(
            uploadToBucket.params.Bucket +
              process.env.BUCKET_URL + "/" +
              uploadToBucket.params.Key
          );
        }
      );
    });
  });
};

module.exports = {
  getVideos,
  postVideo,
};
