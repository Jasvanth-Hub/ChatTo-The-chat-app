const configuredServer = import.meta.env.VITE_SERVER;

if (!configuredServer) {
  throw new Error("VITE_SERVER must be set to the ChatTo API URL before starting or building the client.");
}

export const server = configuredServer.replace(/\/+$/, "");
