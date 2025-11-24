const { expect, agent } = require("./utils.js")

describe("App base handlers", function(){
  this.timeout(20000)

  it("returns 404 (or SPA 200) for unknown route", async () => {
    const r = await agent().get("/__unknown__/route")
    expect([404,400,200]).to.include(r.status)
  })

  it("handles OPTIONS preflight", async () => {
    const r = await agent().options("/api/users")
    expect([200,204]).to.include(r.status)
  })
})
