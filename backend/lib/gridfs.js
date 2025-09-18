// backend/lib/gridfs.js
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

function getBucket() {
  const db = mongoose.connection.db;
  return new GridFSBucket(db, { bucketName: "pdfs" });
}

module.exports = { getBucket };
