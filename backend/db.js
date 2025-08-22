const mongoose = require("mongoose");
const uri = process.env.MONGO_URI;

mongoose.set("strictQuery", true);

mongoose
  .connect(uri)
  .then(() => console.log("Mongo connected"))
  .catch((e) => {
    console.error("Mongo error", e);
    process.exit(1);
  });

module.exports = mongoose;
