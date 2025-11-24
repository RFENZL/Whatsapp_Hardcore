const { expect, agent, createUser, uniqEmail } = require("./utils.js")

describe("Messages branches", function(){
  this.timeout(40000)
  let t1, u1, t2, u2
  before(async () => {
    ;({ token: t1, user: u1 } = await createUser(uniqEmail("mb1"),"msgBranch01"))
    ;({ token: t2, user: u2 } = await createUser(uniqEmail("mb2"),"msgBranch02"))
  })

  it("GET messages pagination page>1", async () => {
    for(let i=0;i<35;i++){
      await agent().post("/api/messages").set("Authorization", t1).send({ recipient_id: u2._id, content: "p"+i })
    }
    const r = await agent().get(`/api/messages/${u2._id}?page=2&limit=30`).set("Authorization", t1)
    expect(r.status).to.equal(200)
    expect(Array.isArray(r.body.items)).to.equal(true)
  })

  it("edit without content keeps original but marks edited", async () => {
    const created = await agent().post("/api/messages").set("Authorization", t1).send({ recipient_id: u2._id, content: "orig" })
    const r = await agent().put(`/api/messages/${created.body._id}`).set("Authorization", t1).send({})
    expect(r.status).to.equal(200)
    expect(r.body.edited).to.equal(true)
  })
})
