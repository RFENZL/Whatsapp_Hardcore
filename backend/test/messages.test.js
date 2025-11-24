const { expect, agent, createUser, uniqEmail } = require("./utils.js")

describe("Messages REST", function () {
  this.timeout(40000)
  let t1, u1, t2, u2
  before(async () => {
    const e1 = uniqEmail("m1")
    const e2 = uniqEmail("m2")
    ;({ token: t1, user: u1 } = await createUser(e1,"msgUser01"))
    ;({ token: t2, user: u2 } = await createUser(e2,"msgUser02"))
  })

  it("401 if missing auth", async () => {
    const r = await agent().post("/api/messages").send({ recipient_id: "64b7b2c5c5c5c5c5c5c5c5c5", content: "x" })
    expect([401,403]).to.include(r.status)
  })

  it("404 if recipient not found (with auth)", async () => {
    const r = await agent().post("/api/messages").set("Authorization", t1).send({ recipient_id: "64b7b2c5c5c5c5c5c5c5c5c5", content: "x" })
    expect([400,404]).to.include(r.status)
  })

  it("create -> 201 and get list", async () => {
    const c = await agent().post("/api/messages").set("Authorization", t1).send({ recipient_id: u2._id, content: "hello" })
    expect(c.status).to.equal(201)
    const r = await agent().get(`/api/messages/${u2._id}?page=1&limit=30`).set("Authorization", t1)
    expect(r.status).to.equal(200)
    expect(Array.isArray(r.body.items)).to.equal(true)
  })

  it("edit only by owner -> 403 for other; 200 for owner", async () => {
    const created = await agent().post("/api/messages").set("Authorization", t1).send({ recipient_id: u2._id, content: "toedit" })
    const r403 = await agent().put(`/api/messages/${created.body._id}`).set("Authorization", t2).send({ content: "hack" })
    expect([403,404]).to.include(r403.status)
    const r200 = await agent().put(`/api/messages/${created.body._id}`).set("Authorization", t1).send({ content: "ok" })
    expect(r200.status).to.equal(200)
    expect(r200.body.edited).to.equal(true)
  })

  it("delete only by owner -> 403 for other; 200 for owner", async () => {
    const created = await agent().post("/api/messages").set("Authorization", t1).send({ recipient_id: u2._id, content: "todel" })
    const r403 = await agent().delete(`/api/messages/${created.body._id}`).set("Authorization", t2)
    expect([403,404]).to.include(r403.status)
    const r200 = await agent().delete(`/api/messages/${created.body._id}`).set("Authorization", t1)
    expect(r200.status).to.equal(200)
  })

  it("mark read only by recipient -> 403 for sender; 200 for recipient", async () => {
    const created = await agent().post("/api/messages").set("Authorization", t1).send({ recipient_id: u2._id, content: "readme" })
    const r403 = await agent().post(`/api/messages/${created.body._id}/read`).set("Authorization", t1)
    expect([403,404]).to.include(r403.status)
    const r200 = await agent().post(`/api/messages/${created.body._id}/read`).set("Authorization", t2)
    expect(r200.status).to.equal(200)
    expect(r200.body.status).to.equal("read")
  })

  it("404 on edit/delete unknown id (with auth)", async () => {
    const id = "64b7b2c5c5c5c5c5c5c5c5c5"
    const e = await agent().put(`/api/messages/${id}`).set("Authorization", t1).send({ content: "x" })
    const d = await agent().delete(`/api/messages/${id}`).set("Authorization", t1)
    expect([404,400]).to.include(e.status)
    expect([404,400]).to.include(d.status)
  })
})
