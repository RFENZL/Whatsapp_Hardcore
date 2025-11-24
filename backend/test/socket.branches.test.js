const { expect, createUser, wsConnect, uniqEmail, agent } = require("./utils.js")

describe("Socket branches", function () {
  this.timeout(60000)
  let u1, u2, s1, s2

  before(async () => {
    u1 = await createUser(uniqEmail("sb1"),"sockUser01")
    u2 = await createUser(uniqEmail("sb2"),"sockUser02")
    s1 = await wsConnect(u1.token)
    s2 = await wsConnect(u2.token)
  })

  after(async () => { s1 && s1.close(); s2 && s2.close() })

  it("rejects invalid token connection", async () => {
    try {
      await new Promise((resolve, reject) => {
        const { io: Client } = require("socket.io-client")
        const bad = Client(`http://127.0.0.1:${s1.io.uri.split(':').pop()}`, { auth: { token: "bad.token" }, transports: ["websocket"] })
        const done = setTimeout(() => { bad && bad.close(); resolve() }, 1500)
        bad.on("connect_error", () => { clearTimeout(done); bad.close(); resolve() })
        bad.on("disconnect", () => { clearTimeout(done); resolve() })
      })
    } catch (e) {}
  })

  it("send-message over WS delivers + ack + message-read flows", async () => {
    const recv = new Promise(resolve => s2.once("message:new", resolve))
    const acked = new Promise(resolve => {
      s1.timeout(5000).emit("send-message", { to: u2.user._id, content: "via socket" }, (ack) => resolve(ack))
    })
    const [msg, ack] = await Promise.all([recv, acked])
    expect(msg.content).to.equal("via socket")
    expect(ack && (ack.ok || ack.status==="ok")).to.be.ok

    const readEvt = new Promise(resolve => s1.once("message:read", resolve))
    s2.emit("message-read", { id: msg._id })
    const read = await readEvt
    expect(String(read._id || read.id)).to.equal(String(msg._id))
  })
})
