import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { resolve } from 'path'
import { rejects } from 'assert'

const storage = new Storage()

const rawVideoBucketName = 'ak-yt-raw-videos'
const processesVideoBucketName = 'ak-yt-processed-videos'

const localRawVideoPath = './raw-videos'
const localProcessedVideoPath = './processed-videos'

export function setupDirectories() {
  ensureDirectoryExistence(localRawVideoPath)
  ensureDirectoryExistence(localProcessedVideoPath)
}

/**
 * @param rawVideoName {@link localRawVideoPath}
 * @param processedVideoName {@link localProcessedVideoPath}
 * @returns
 */

export function convertVideo(rawVideoName: string, processedVideoName: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOption('-vf', 'scale=-1:360')
      .on('end', () => {
        console.log('Video processing ended')
        resolve()
      })
      .on('error', (err) => {
        console.log(`An error occured:${err.message}`)
        reject(err)
      })
      .save(`${localProcessedVideoPath}/${processedVideoName}`)
  })
}

/**
 * @param fileName
 * {@link rawVideoBucketName} {@link localRawVideoPath}
 * @returns
 */

export async function downloadRawVideo(fileName: string) {
  await storage
    .bucket(rawVideoBucketName)
    .file(fileName)
    .download({ destination: `${localRawVideoPath}/${fileName} ` })
  console.log(
    `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}${fileName}`
  )
}

/**
 * @param fileName
 * {@link localProcessedVideoPath} {@link processesVideoBucketName}
 * @returns
 */
export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processesVideoBucketName)
  await bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
    destination: fileName,
  })
  await bucket.file(fileName).makePublic()
  console.log(
    `${localProcessedVideoPath}/${fileName} uploaded to gs://${processesVideoBucketName}${fileName}`
  )
}

/**
 * @param filePath
 * @returns
 */

function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(`Failed to delete the file at ${filePath}`, err)
          reject(err)
        } else {
          console.log(`File deleted at ${filePath}`)
          resolve()
        }
      })
    } else {
      console.log(`File note found at ${filePath},skipping the delete`)
      resolve()
    }
  })
}
/**
 * @param {string} dirPath
 */
function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`Directory Created at ${dirPath}`)
  }
}

/**
 * @param fileName
 * {@link localRawVideoPath}
 * @returns
 */
export function deleteRawVideo(fileName: string) {
  return deleteFile(`${localRawVideoPath}/${fileName}`)
}

/**
 * @param fileName
 * {@link localProcessedVideoPath}
 * @returns
 */
export function deleteProcessedVideo(fileName: string) {
  return deleteFile(`${localProcessedVideoPath}/${fileName}`)
}
