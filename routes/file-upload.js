const express = require('express')
const router = express.Router()
const multer = require('multer')
const { Storage } = require('@google-cloud/storage')

const storage = new Storage({
  projectId: process.env.CLOUD_STORAGE_ID
})

const m = multer({ storage: multer.memoryStorage() })

router.post(
  '/file-upload',
  // passport.authenticate('jwt', { session: false }),
  m.single('file'),
  async function (req, res, next) {
    // currently putting all the files in a single bucket
    const bucketName = 'rebus-default-bucket'

    let bucket = storage.bucket(bucketName)

    const blob = bucket.file(req.file.originalname)

    const stream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype // allows us to view the image in a browser instead of downloading it
      }
    })

    stream.on('error', err => {
      res
        .status(400)
        .send(`error connecting to the google cloud bucket: ${err.message}`)
    })

    stream.on('finish', () => {
      url = `https://storage.googleapis.com/${bucket.name}/${blob.name}`

      // we might want to remove the makePublic
      blob.makePublic().then(() => {
        res.setHeader(
          'Content-Type',
          'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
        )
        res.end(JSON.stringify({ url }))
      })
    })

    stream.end(req.file.buffer)
  }
)

module.exports = router
