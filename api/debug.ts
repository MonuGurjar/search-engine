import type { IncomingMessage, ServerResponse } from "node:http"
import { Buffer } from "node:buffer"
import https from "node:https"

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const logs: string[] = []
  try {
    logs.push("Step 1: Handler started")
    const url = "https://os-3c0470b3-voidcore.j.aivencloud.com:12170/indexed_pages/_count"
    const user = "avnadmin"
    const pass = Buffer.from("QVZOU191RFFZaVVCMGFWeDUzSmk4Y0lf", "base64").toString("utf-8")
    const auth = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64")

    logs.push("Step 2: Connecting to OpenSearch")
    const countResult = await new Promise((resolve, reject) => {
      const parsed = new URL(url)
      const options = {
        hostname: parsed.hostname,
        port: 12170,
        path: parsed.pathname,
        method: "POST",
        family: 4,
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
      }
      const r = https.request(options, (resp) => {
        let d = ""
        resp.on("data", (c) => (d += c))
        resp.on("end", () => resolve(JSON.parse(d)))
      })
      r.on("error", (e) => reject(e))
      r.on("timeout", () => {
        r.destroy()
        reject(new Error("Timeout"))
      })
      r.write("{}")
      r.end()
    })

    logs.push("Step 3: Got count result: " + JSON.stringify(countResult))

    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ success: true, countResult, logs }))
  } catch (err: any) {
    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ success: false, error: err?.message, stack: err?.stack, logs }))
  }
}
