const { expect, createUser, wsConnect, uniqEmail, agent } = require("./utils.js")

describe("Socket", function () {
  this.timeout(50000)
  let u1, u2, s1, s2
  before(async () => {
    u1 = await createUser(uniqEmail("ws1"),"wsUser01")
    u2 = await createUser(uniqEmail("ws2"),"wsUser02")
    s1 = await wsConnect(u1.token)
    s2 = await wsConnect(u2.token)
  })
  after(async () => { s1 && s1.close(); s2 && s2.close() })

  it("realtime delivery to both sender and recipient", async () => {
    const gotR = new Promise(resolve => s2.once("message:new", resolve))
    const gotS = new Promise(resolve => s1.once("message:new", resolve))
    const res = await agent().post("/api/messages").set("Authorization", u1.token).send({ recipient_id: u2.user._id, content: "hi ws" })
    expect(res.status).to.equal(201)
    const [mR, mS] = await Promise.all([gotR, gotS])
    expect(mR.content).to.equal("hi ws")
    expect(mS.content).to.equal("hi ws")
  })

  it("typing + stopped + user-status", async () => {
    const typ = new Promise(resolve => s2.once("typing", resolve))
    s1.emit("typing", { to: u2.user._id })
    const e = await typ
    expect(e.from).to.equal(String(u1.user._id))

    const status = new Promise(resolve => s2.once("user-status", resolve))
    s1.disconnect()
    const st = await status
    expect(st.status).to.equal("offline")
  })
})
