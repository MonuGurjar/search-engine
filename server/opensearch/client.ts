import fs from "node:fs"
import path from "node:path"
import https from "node:https"

export interface OpenSearchConfig {
  url: string
  user: string
  password: string
  index: string
  authHeader: string
}

const DEFAULT_OPENSEARCH_URL =
  "https://os-3c0470b3-voidcore.j.aivencloud.com:12170"
const DEFAULT_OPENSEARCH_USER = "avnadmin"
// Fallback password base64 encoded for server use only
const DEFAULT_OPENSEARCH_PASSWORD = Buffer.from(
  "QVZOU191RFFZaVVCMGFWeDUzSmk4Y0lf",
  "base64",
).toString("utf-8")
const DEFAULT_OPENSEARCH_INDEX = "indexed_pages"

/**
 * Resolves OpenSearch credentials exclusively on the server side.
 * Checks process.env, .env, and ../.env.
 * NEVER exposed to the frontend bundle.
 */
export function resolveOpenSearchEnv(): OpenSearchConfig {
  const envPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ]

  const envVars: Record<string, string> = {}
  for (const p of envPaths) {
    try {
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, "utf-8").split("\n")
        for (const l of lines) {
          const match = l.match(/^([A-Z0-9_]+)=(.*)$/)
          if (match) envVars[match[1]] = match[2].trim()
        }
      }
    } catch {}
  }

  const url =
    process.env.OPENSEARCH_URL ||
    envVars["OPENSEARCH_URL"] ||
    DEFAULT_OPENSEARCH_URL

  const user =
    process.env.OPENSEARCH_USER ||
    envVars["OPENSEARCH_USER"] ||
    DEFAULT_OPENSEARCH_USER

  const password =
    process.env.OPENSEARCH_PASSWORD ||
    envVars["OPENSEARCH_PASSWORD"] ||
    DEFAULT_OPENSEARCH_PASSWORD

  const index =
    process.env.OPENSEARCH_INDEX ||
    envVars["OPENSEARCH_INDEX"] ||
    DEFAULT_OPENSEARCH_INDEX

  const authHeader =
    "Basic " + Buffer.from(`${user}:${password}`).toString("base64")

  return { url, user, password, index, authHeader }
}

/**
 * Performs a low-level HTTPS request to OpenSearch.
 * Uses IPv4 family to ensure reliable resolution across various host environments.
 */
export async function executeOpenSearchQuery<T = any>(
  endpointPath: string,
  payload: any,
  timeoutMs = 10000,
): Promise<T> {
  const { url, index, authHeader } = resolveOpenSearchEnv()
  const body = typeof payload === "string" ? payload : JSON.stringify(payload)
  const fullPath = endpointPath.startsWith("/")
    ? endpointPath
    : `/${endpointPath}`
  const targetUrl = new URL(`${url}/${index}${fullPath}`)

  return new Promise<T>((resolve, reject) => {
    const reqOptions: https.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port ? parseInt(targetUrl.port, 10) : 443,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: "POST",
      family: 4,
      timeout: timeoutMs,
      rejectUnauthorized: false,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Authorization: authHeader,
      },
    }

    const req = https.request(reqOptions, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(
              new Error(
                `OpenSearch HTTP error: ${res.statusCode} ${data.slice(0, 200)}`,
              ),
            )
          }
          const parsed = JSON.parse(data)
          resolve(parsed as T)
        } catch (err: any) {
          reject(
            new Error(`Failed to parse OpenSearch response: ${err.message}`),
          )
        }
      })
    })

    req.on("timeout", () => {
      req.destroy()
      reject(new Error(`OpenSearch request timed out after ${timeoutMs}ms`))
    })

    req.on("error", (err) => {
      reject(new Error(`OpenSearch connection error: ${err.message}`))
    })

    req.write(body)
    req.end()
  })
}
