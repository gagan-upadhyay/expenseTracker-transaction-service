// helmetConfig.ts
import helmet from "helmet";

const isProd = process.env.NODE_ENV === "production";

export const helmetConfig = helmet({
  hidePoweredBy: true,
  noSniff: true,
  originAgentCluster: true,

  frameguard: {
    action: "deny"
  },

  referrerPolicy: {
    policy: "no-referrer"
  },

  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://your-image-cdn.com"],
      connectSrc: ["'self'", "https://api.yourdomain.com"],
      objectSrc: ["'none'"],
    //   upgradeInsecureRequests: isProd ? [] : undefined,
    }
  },

  ...(isProd && {
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
});