import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = "railway-dispatch-webapp";
const forGitHubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  plugins: [react()],
  base: forGitHubPages ? `/${repoName}/` : "/",
  server: {
    port: 5173
  }
});
