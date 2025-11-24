const { expect, agent, createUser, uniqEmail } = require("./utils.js")

describe("Conversations", function () {
  this.timeout(30000)
  let a, b
  before(async () => {
    a = await createUser(uniqEmail("c1"),"convUser01")
    b = await createUser(uniqEmail("c2"),"convUser02")
  })

  it("produces unread counters", async () => {
    await agent().post("/api/messages").set("Authorization", a.token).send({ recipient_id: b.user._id, content: "m1" })
    await agent().post("/api/messages").set("Authorization", a.token).send({ recipient_id: b.user._id, content: "m2" })
    const r = await agent().get("/api/conversations").set("Authorization", b.token)
    expect(r.status).to.equal(200)
    const row = r.body.find(x => String(x.otherUser._id) === String(a.user._id))
    expect(!!row).to.equal(true)
    expect(row.unread >= 1).to.equal(true)
  })
})
