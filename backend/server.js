// backend/server.js
const { createApp } = require("./app");
const app = createApp();
const port = process.env.PORT || 5174;
app.listen(port, () => console.log(`API listening on :${port}`));
// change to run the deploy
