export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function optionalEnv(name: string, fallback = ""): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export function getQpBaseUrl() {
  const baseUrl = optionalEnv("QP_API_BASE_URL", "https://qpxpress.com:8001/");
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
