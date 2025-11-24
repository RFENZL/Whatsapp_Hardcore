const { setupServer, teardownServer } = require("./utils.js")

before(async function() {
  this.timeout(60000)
  await setupServer()
})

after(async function() {
  this.timeout(60000)
  await teardownServer()
})
