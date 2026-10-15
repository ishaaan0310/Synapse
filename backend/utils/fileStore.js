// Stores uploaded files in MongoDB (GridFS) instead of the local disk.
// Hosts like Render wipe the disk on every restart or redeploy, so files
// saved there would disappear. GridFS keeps them in Atlas with the rest
// of the data.
const mongoose = require('mongoose');
const { Readable } = require('stream');

const BUCKET_NAME = 'uploads';

const getBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('Database is not connected');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME
  });
};

// Save a multer memory-storage file; resolves the new GridFS file id
const saveFile = (file, { userId } = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { user: userId ? String(userId) : undefined }
    });

    Readable.from(file.buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });

const toObjectId = (id) =>
  id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id));

const fileExists = async (id) => {
  const files = await getBucket().find({ _id: toObjectId(id) }).limit(1).toArray();
  return files[0] || null;
};

const openDownloadStream = (id) => getBucket().openDownloadStream(toObjectId(id));

// Deleting a missing file is not an error
const deleteFile = async (id) => {
  if (!id) return;
  try {
    await getBucket().delete(toObjectId(id));
  } catch (error) {
    if (!/FileNotFound|File not found/i.test(error.message)) throw error;
  }
};

module.exports = { saveFile, fileExists, openDownloadStream, deleteFile };
