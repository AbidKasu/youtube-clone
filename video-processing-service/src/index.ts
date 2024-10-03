import express, { Request, Response } from 'express'
import ffmpeg from 'fluent-ffmpeg'
import {
  convertVideo,
  deleteProcessedVideo,
  deleteRawVideo,
  downloadRawVideo,
  setupDirectories,
  uploadProcessedVideo,
} from './storage'

setupDirectories()

const app = express()
app.use(express.json())
app.post('/process-video', async (req, res) => {
  let data
  try {
    const message = Buffer.from(req.body.message.data, 'base64').toString(
      'utf8'
    )
    data = JSON.parse(message)
    if (!data.name) {
      throw new Error('Invalid message payload received')
    }
  } catch (error) {
    console.error(error)
    return res.status(400).send('Bad Request: Missing filename')
  }

  const inputFilename = data.name
  const outFileName = `processed-${inputFilename}`

  try {
    await downloadRawVideo(inputFilename)
    convertVideo(inputFilename, outFileName)
    await uploadProcessedVideo(outFileName)
    res.status(200).send('Video processed successfully')
  } catch (err) {
    await Promise.all([
      deleteRawVideo(inputFilename),
      deleteProcessedVideo(outFileName),
    ])

    console.error(err)
    res.status(500).send('Internal Server Error: video processing failed.')
  }
  await uploadProcessedVideo(outFileName)
  await Promise.all([
    deleteRawVideo(inputFilename),
    deleteProcessedVideo(outFileName),
  ])
  return res.status(200).send('Processing')
})
const port = 3000
app.listen(port, () => {
  console.log('started')
})
