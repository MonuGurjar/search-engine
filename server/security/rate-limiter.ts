import type { IncomingMessage } from "node:http"

interface RateLimitRecord {
  count: number
  resetTime: number
}

const ipRequestMap = new Map<string, RateLimitRecord>()

export interface RateLimitOptions {
  windowMs?: number
  maxRequests?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetTime: number
}

/**
 * Extracts client IP from request headers or socket safely in any hosting environment.
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers?.["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.trim()) {
    const ips = forwarded.split(",")
    return ips[0].trim()
  }
  const realIp = req.headers?.["x-real-ip"]
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim()
  }
  return req.socket?.remoteAddress || "127.0.0.1"
}

/**
 * Evaluates rate limit for an incoming request.
 * Cleans up expired entries lazily on demand without persistent timers.
 */
export function checkRateLimit(
  req: IncomingMessage,
  options: RateLimitOptions = {},
): RateLimitResult {
  const windowMs = options.windowMs || 60000 // 1 minute
  const maxRequests = options.maxRequests || 120 // 120 req/min default
  const ip = getClientIp(req)
  const now = Date.now()

  // Lazy cleanup if map grows large to prevent memory leaks in long-lived lambdas
  if (ipRequestMap.size > 500) {
    for (const [key, record] of ipRequestMap.entries()) {
      if (now > record.resetTime) {
        ipRequestMap.delete(key)
      }
    }
  }

  let record = ipRequestMap.get(ip)
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    }
    ipRequestMap.set(ip, record)
    return {
      allowed: true,
      remaining: maxRequests - 1,
      limit: maxRequests,
      resetTime: record.resetTime,
    }
  }

  record.count += 1
  const allowed = record.count <= maxRequests
  const remaining = Math.max(0, maxRequests - record.count)

  return {
    allowed,
    remaining,
    limit: maxRequests,
    resetTime: record.resetTime,
  }
}
