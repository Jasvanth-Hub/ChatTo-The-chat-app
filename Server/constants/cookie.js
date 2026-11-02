export const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  // CHIPS keeps this cross-site cookie partitioned under the ChatTo frontend,
  // allowing Chrome's third-party-cookie protections to remain enabled.
  sameSite: "none",
  partitioned: true,
  httpOnly: true,
  secure: true,
  path: "/",
};
