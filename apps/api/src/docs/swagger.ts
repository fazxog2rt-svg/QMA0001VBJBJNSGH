import swaggerJsdoc from "swagger-jsdoc";
import path from "node:path";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "NexusBot API",
      version: "1.0.0",
      description:
        "REST API and realtime gateway for the NexusBot Discord bot SaaS platform. " +
        "Cookie-based session auth is used by the dashboard; `Authorization: Bearer nxb_...` " +
        "API keys are used by third-party/developer integrations against the `/public` routes.",
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "access_token",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "NexusBot API key, prefixed with nxb_",
        },
      },
    },
  },
  // Scans JSDoc `@openapi` blocks in every router file.
  apis: [path.join(__dirname, "..", "modules", "**", "*.ts")],
};

export const swaggerSpec = swaggerJsdoc(options);
