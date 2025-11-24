const { expect, agent, createUser, uniqEmail } = require("./utils.js")

describe("Users branches", function(){
  this.timeout(30000)
  let t1, u1
  before(async () => {
    ;({ token: t1, user: u1 } = await createUser(uniqEmail("ub1"),"usrBranch01"))
  })

  it("search handles empty q", async () => {
    const r = await agent().get(`/api/users/search`).set("Authorization", t1)
    expect([200,400]).to.include(r.status)
  })

  it("update profile rejects too short username", async () => {
    const r = await agent().put(`/api/users/profile`).set("Authorization", t1).send({ username: "ab" })
    expect([400,422]).to.include(r.status)
  })
})
