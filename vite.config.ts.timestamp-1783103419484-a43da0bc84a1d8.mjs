// vite.config.ts
import { defineConfig, loadEnv } from "file:///E:/Programming/Projects/Reel_Manager/node_modules/vite/dist/node/index.js";
import react from "file:///E:/Programming/Projects/Reel_Manager/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///E:/Programming/Projects/Reel_Manager/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
import { execFile } from "child_process";
import { existsSync } from "fs";
var __vite_injected_original_dirname = "E:\\Programming\\Projects\\Reel_Manager";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    resolve: {
      alias: {
        src: path.resolve(__vite_injected_original_dirname, "./src"),
        assets: path.resolve(__vite_injected_original_dirname, "./src/assets"),
        components: path.resolve(__vite_injected_original_dirname, "./src/components"),
        contexts: path.resolve(__vite_injected_original_dirname, "./src/contexts"),
        hooks: path.resolve(__vite_injected_original_dirname, "./src/hooks"),
        integrations: path.resolve(__vite_injected_original_dirname, "./src/integrations"),
        lib: path.resolve(__vite_injected_original_dirname, "./src/lib"),
        pages: path.resolve(__vite_injected_original_dirname, "./src/pages"),
        types: path.resolve(__vite_injected_original_dirname, "./src/types"),
        utils: path.resolve(__vite_injected_original_dirname, "./src/utils"),
        constants: path.resolve(__vite_injected_original_dirname, "./src/constants")
      }
    },
    server: {
      port: 3e3,
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const urlObj = new URL(req.url || "", `http://${req.headers.host}`);
          const pathname = urlObj.pathname;
          if (pathname === "/api/proxy-image" && req.method === "GET") {
            const imageUrl = urlObj.searchParams.get("url");
            if (!imageUrl) {
              res.statusCode = 400;
              res.end("Missing URL parameter");
              return;
            }
            try {
              const imageResponse = await fetch(imageUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  "Referer": "https://www.instagram.com/"
                }
              });
              if (!imageResponse.ok) {
                res.statusCode = imageResponse.status;
                res.end(`Failed to fetch image: ${imageResponse.statusText}`);
                return;
              }
              const contentType = imageResponse.headers.get("Content-Type") || "image/jpeg";
              const arrayBuffer = await imageResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              res.setHeader("Content-Type", contentType);
              res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=43200");
              res.statusCode = 200;
              res.end(buffer);
            } catch (err) {
              res.statusCode = 500;
              res.end("Error proxying image");
            }
            return;
          }
          if (pathname === "/api/thumbnail" && req.method === "POST") {
            try {
              const bodyText = await new Promise((resolve, reject) => {
                let data = "";
                req.on("data", (chunk) => {
                  data += chunk;
                });
                req.on("end", () => resolve(data));
                req.on("error", (err) => reject(err));
              });
              const parsedBody = JSON.parse(bodyText || "{}");
              const { url } = parsedBody;
              if (!url) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "URL is required" }));
                return;
              }
              const placeholders = [
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1618005198143-e528346d9a59?q=80&w=600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop"
              ];
              const projectRoot = process.cwd();
              const scriptPath = path.resolve(projectRoot, "./scripts/get_thumbnail.py");
              const localPython = process.platform === "win32" ? path.resolve(projectRoot, "./.venv/Scripts/python.exe") : path.resolve(projectRoot, "./.venv/bin/python");
              const pythonExecutable = existsSync(localPython) ? localPython : "python";
              console.log(`[Reel Manager] Using Python executable: ${pythonExecutable}`);
              console.log(`[Reel Manager] Executing script: ${scriptPath} with URL: ${url}`);
              const pythonResult = await new Promise((resolve) => {
                execFile(pythonExecutable, [scriptPath, url], {
                  timeout: 25e3,
                  env: { ...process.env, ...env }
                }, (error, stdout, stderr) => {
                  if (error) {
                    console.error("Error running python get_thumbnail script:", error);
                    console.error("Script stdout:", stdout);
                    console.error("Script stderr:", stderr);
                    resolve(null);
                    return;
                  }
                  try {
                    const startIdx = stdout.indexOf("{");
                    const endIdx = stdout.lastIndexOf("}");
                    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
                      throw new Error("No JSON object found in stdout");
                    }
                    const data = JSON.parse(stdout.slice(startIdx, endIdx + 1));
                    if (data.thumbnail_url) {
                      resolve(data);
                      return;
                    }
                  } catch (parseErr) {
                    console.error("Failed to parse JSON from python script output:", parseErr, stdout);
                  }
                  resolve(null);
                });
              });
              if (pythonResult) {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({
                  thumbnail: pythonResult.thumbnail_url,
                  username: pythonResult.username,
                  caption: pythonResult.caption || ""
                }));
                return;
              }
              const token = env.NEXT_PUBLIC_INSTAGRAM_OEMBED_TOKEN || env.INSTAGRAM_OEMBED_TOKEN;
              if (token) {
                const oembedUrl = `https://graph.facebook.com/v17.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}`;
                const oembedResponse = await fetch(oembedUrl);
                if (oembedResponse.ok) {
                  const data = await oembedResponse.json();
                  if (data.thumbnail_url) {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({
                      thumbnail: data.thumbnail_url,
                      username: data.author_name || "instagram_user",
                      caption: data.title || ""
                    }));
                    return;
                  }
                }
              }
              const randomIndex = Math.floor(Math.random() * placeholders.length);
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ thumbnail: placeholders[randomIndex] }));
            } catch (err) {
              const placeholders = [
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1618005198143-e528346d9a59?q=80&w=600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop"
              ];
              const randomIndex = Math.floor(Math.random() * placeholders.length);
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ thumbnail: placeholders[randomIndex] }));
            }
            return;
          }
          next();
        });
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxQcm9ncmFtbWluZ1xcXFxQcm9qZWN0c1xcXFxSZWVsX01hbmFnZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXFByb2dyYW1taW5nXFxcXFByb2plY3RzXFxcXFJlZWxfTWFuYWdlclxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovUHJvZ3JhbW1pbmcvUHJvamVjdHMvUmVlbF9NYW5hZ2VyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSAnZnMnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgLy8gTG9hZCBlbnYgZmlsZSBmcm9tIHRoZSBwcm9qZWN0IHJvb3RcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJylcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICB0YWlsd2luZGNzcygpXG4gICAgXSxcbiAgICBlbnZQcmVmaXg6IFsnVklURV8nLCAnTkVYVF9QVUJMSUNfJ10sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgc3JjOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgYXNzZXRzOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvYXNzZXRzJyksXG4gICAgICAgIGNvbXBvbmVudHM6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb21wb25lbnRzJyksXG4gICAgICAgIGNvbnRleHRzOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29udGV4dHMnKSxcbiAgICAgICAgaG9va3M6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9ob29rcycpLFxuICAgICAgICBpbnRlZ3JhdGlvbnM6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9pbnRlZ3JhdGlvbnMnKSxcbiAgICAgICAgbGliOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvbGliJyksXG4gICAgICAgIHBhZ2VzOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvcGFnZXMnKSxcbiAgICAgICAgdHlwZXM6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy90eXBlcycpLFxuICAgICAgICB1dGlsczogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzJyksXG4gICAgICAgIGNvbnN0YW50czogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2NvbnN0YW50cycpXG4gICAgICB9XG4gICAgfSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHBvcnQ6IDMwMDAsXG4gICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgICAgY29uc3QgdXJsT2JqID0gbmV3IFVSTChyZXEudXJsIHx8ICcnLCBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdH1gKVxuICAgICAgICAgIGNvbnN0IHBhdGhuYW1lID0gdXJsT2JqLnBhdGhuYW1lXG5cbiAgICAgICAgICAvLyAxLiBHRVQgL2FwaS9wcm94eS1pbWFnZT91cmw9Li4uXG4gICAgICAgICAgaWYgKHBhdGhuYW1lID09PSAnL2FwaS9wcm94eS1pbWFnZScgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGltYWdlVXJsID0gdXJsT2JqLnNlYXJjaFBhcmFtcy5nZXQoJ3VybCcpXG4gICAgICAgICAgICBpZiAoIWltYWdlVXJsKSB7XG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwXG4gICAgICAgICAgICAgIHJlcy5lbmQoJ01pc3NpbmcgVVJMIHBhcmFtZXRlcicpXG4gICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCBpbWFnZVJlc3BvbnNlID0gYXdhaXQgZmV0Y2goaW1hZ2VVcmwsIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAnVXNlci1BZ2VudCc6ICdNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTIwLjAuMC4wIFNhZmFyaS81MzcuMzYnLFxuICAgICAgICAgICAgICAgICAgJ1JlZmVyZXInOiAnaHR0cHM6Ly93d3cuaW5zdGFncmFtLmNvbS8nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIGlmICghaW1hZ2VSZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gaW1hZ2VSZXNwb25zZS5zdGF0dXNcbiAgICAgICAgICAgICAgICByZXMuZW5kKGBGYWlsZWQgdG8gZmV0Y2ggaW1hZ2U6ICR7aW1hZ2VSZXNwb25zZS5zdGF0dXNUZXh0fWApXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBjb250ZW50VHlwZSA9IGltYWdlUmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpIHx8ICdpbWFnZS9qcGVnJ1xuICAgICAgICAgICAgICBjb25zdCBhcnJheUJ1ZmZlciA9IGF3YWl0IGltYWdlUmVzcG9uc2UuYXJyYXlCdWZmZXIoKVxuICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlcilcblxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCBjb250ZW50VHlwZSlcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsICdwdWJsaWMsIG1heC1hZ2U9ODY0MDAsIHN0YWxlLXdoaWxlLXJldmFsaWRhdGU9NDMyMDAnKVxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMFxuICAgICAgICAgICAgICByZXMuZW5kKGJ1ZmZlcilcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxuICAgICAgICAgICAgICByZXMuZW5kKCdFcnJvciBwcm94eWluZyBpbWFnZScpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyAyLiBQT1NUIC9hcGkvdGh1bWJuYWlsXG4gICAgICAgICAgaWYgKHBhdGhuYW1lID09PSAnL2FwaS90aHVtYm5haWwnICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY29uc3QgYm9keVRleHQgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZGF0YSA9ICcnXG4gICAgICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4geyBkYXRhICs9IGNodW5rIH0pXG4gICAgICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKGRhdGEpKVxuICAgICAgICAgICAgICAgIHJlcS5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgY29uc3QgcGFyc2VkQm9keSA9IEpTT04ucGFyc2UoYm9keVRleHQgfHwgJ3t9JylcbiAgICAgICAgICAgICAgY29uc3QgeyB1cmwgfSA9IHBhcnNlZEJvZHlcblxuICAgICAgICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1VSTCBpcyByZXF1aXJlZCcgfSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBwbGFjZWhvbGRlcnMgPSBbXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNjE4MDA1MTgyMzg0LWE4M2E4YmQ1N2ZiZT9xPTgwJnc9NjAwJmF1dG89Zm9ybWF0JmZpdD1jcm9wJyxcbiAgICAgICAgICAgICAgICAnaHR0cHM6Ly9pbWFnZXMudW5zcGxhc2guY29tL3Bob3RvLTE2MzQwMTc4Mzk0NjQtNWMzMzllYmUzY2I0P3E9ODAmdz02MDAmYXV0bz1mb3JtYXQmZml0PWNyb3AnLFxuICAgICAgICAgICAgICAgICdodHRwczovL2ltYWdlcy51bnNwbGFzaC5jb20vcGhvdG8tMTYxODAwNTE5ODE0My1lNTI4MzQ2ZDlhNTk/cT04MCZ3PTYwMCZhdXRvPWZvcm1hdCZmaXQ9Y3JvcCcsXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNjA0ODcxMDAwNjM2LTA3NGZhNTExNzk0NT9xPTgwJnc9NjAwJmF1dG89Zm9ybWF0JmZpdD1jcm9wJ1xuICAgICAgICAgICAgICBdXG5cbiAgICAgICAgICAgICAgLy8gMS4gVHJ5IHRvIGZldGNoIHVzaW5nIFB5dGhvbiBzY3JpcHQgKGluc3RhbG9hZGVyKVxuICAgICAgICAgICAgICBjb25zdCBwcm9qZWN0Um9vdCA9IHByb2Nlc3MuY3dkKClcbiAgICAgICAgICAgICAgY29uc3Qgc2NyaXB0UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9qZWN0Um9vdCwgJy4vc2NyaXB0cy9nZXRfdGh1bWJuYWlsLnB5JylcbiAgICAgICAgICAgICAgY29uc3QgbG9jYWxQeXRob24gPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInXG4gICAgICAgICAgICAgICAgPyBwYXRoLnJlc29sdmUocHJvamVjdFJvb3QsICcuLy52ZW52L1NjcmlwdHMvcHl0aG9uLmV4ZScpXG4gICAgICAgICAgICAgICAgOiBwYXRoLnJlc29sdmUocHJvamVjdFJvb3QsICcuLy52ZW52L2Jpbi9weXRob24nKVxuICAgICAgICAgICAgICBjb25zdCBweXRob25FeGVjdXRhYmxlID0gZXhpc3RzU3luYyhsb2NhbFB5dGhvbikgPyBsb2NhbFB5dGhvbiA6ICdweXRob24nXG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtSZWVsIE1hbmFnZXJdIFVzaW5nIFB5dGhvbiBleGVjdXRhYmxlOiAke3B5dGhvbkV4ZWN1dGFibGV9YClcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtSZWVsIE1hbmFnZXJdIEV4ZWN1dGluZyBzY3JpcHQ6ICR7c2NyaXB0UGF0aH0gd2l0aCBVUkw6ICR7dXJsfWApXG5cbiAgICAgICAgICAgICAgY29uc3QgcHl0aG9uUmVzdWx0ID0gYXdhaXQgbmV3IFByb21pc2U8eyB0aHVtYm5haWxfdXJsOiBzdHJpbmc7IHVzZXJuYW1lOiBzdHJpbmc7IGNhcHRpb24/OiBzdHJpbmcgfSB8IG51bGw+KChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXhlY0ZpbGUocHl0aG9uRXhlY3V0YWJsZSwgW3NjcmlwdFBhdGgsIHVybF0sIHsgXG4gICAgICAgICAgICAgICAgICB0aW1lb3V0OiAyNTAwMCxcbiAgICAgICAgICAgICAgICAgIGVudjogeyAuLi5wcm9jZXNzLmVudiwgLi4uZW52IH1cbiAgICAgICAgICAgICAgICB9LCAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcnVubmluZyBweXRob24gZ2V0X3RodW1ibmFpbCBzY3JpcHQ6JywgZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NjcmlwdCBzdGRvdXQ6Jywgc3Rkb3V0KVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTY3JpcHQgc3RkZXJyOicsIHN0ZGVycilcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0SWR4ID0gc3Rkb3V0LmluZGV4T2YoJ3snKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmRJZHggPSBzdGRvdXQubGFzdEluZGV4T2YoJ30nKVxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnRJZHggPT09IC0xIHx8IGVuZElkeCA9PT0gLTEgfHwgZW5kSWR4IDwgc3RhcnRJZHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIEpTT04gb2JqZWN0IGZvdW5kIGluIHN0ZG91dCcpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2Uoc3Rkb3V0LnNsaWNlKHN0YXJ0SWR4LCBlbmRJZHggKyAxKSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudGh1bWJuYWlsX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHBhcnNlIEpTT04gZnJvbSBweXRob24gc2NyaXB0IG91dHB1dDonLCBwYXJzZUVyciwgc3Rkb3V0KVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgaWYgKHB5dGhvblJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICAgICAgICAgIHRodW1ibmFpbDogcHl0aG9uUmVzdWx0LnRodW1ibmFpbF91cmwsXG4gICAgICAgICAgICAgICAgICB1c2VybmFtZTogcHl0aG9uUmVzdWx0LnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgICAgY2FwdGlvbjogcHl0aG9uUmVzdWx0LmNhcHRpb24gfHwgJydcbiAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIDIuIEZhbGxiYWNrIHRvIEluc3RhZ3JhbSBvRW1iZWQgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gZW52Lk5FWFRfUFVCTElDX0lOU1RBR1JBTV9PRU1CRURfVE9LRU4gfHwgZW52LklOU1RBR1JBTV9PRU1CRURfVE9LRU5cblxuICAgICAgICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvZW1iZWRVcmwgPSBgaHR0cHM6Ly9ncmFwaC5mYWNlYm9vay5jb20vdjE3LjAvaW5zdGFncmFtX29lbWJlZD91cmw9JHtlbmNvZGVVUklDb21wb25lbnQodXJsKX0mYWNjZXNzX3Rva2VuPSR7dG9rZW59YFxuICAgICAgICAgICAgICAgIGNvbnN0IG9lbWJlZFJlc3BvbnNlID0gYXdhaXQgZmV0Y2gob2VtYmVkVXJsKVxuICAgICAgICAgICAgICAgIGlmIChvZW1iZWRSZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IG9lbWJlZFJlc3BvbnNlLmpzb24oKVxuICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudGh1bWJuYWlsX3VybCkge1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMFxuICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWw6IGRhdGEudGh1bWJuYWlsX3VybCxcbiAgICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogZGF0YS5hdXRob3JfbmFtZSB8fCAnaW5zdGFncmFtX3VzZXInLFxuICAgICAgICAgICAgICAgICAgICAgIGNhcHRpb246IGRhdGEudGl0bGUgfHwgJydcbiAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIDMuIFVsdGltYXRlIEZhbGxiYWNrIHRvIHJhbmRvbSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICBjb25zdCByYW5kb21JbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBsYWNlaG9sZGVycy5sZW5ndGgpXG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJylcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHRodW1ibmFpbDogcGxhY2Vob2xkZXJzW3JhbmRvbUluZGV4XSB9KSlcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICBjb25zdCBwbGFjZWhvbGRlcnMgPSBbXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNjE4MDA1MTgyMzg0LWE4M2E4YmQ1N2ZiZT9xPTgwJnc9NjAwJmF1dG89Zm9ybWF0JmZpdD1jcm9wJyxcbiAgICAgICAgICAgICAgICAnaHR0cHM6Ly9pbWFnZXMudW5zcGxhc2guY29tL3Bob3RvLTE2MzQwMTc4Mzk0NjQtNWMzMzllYmUzY2I0P3E9ODAmdz02MDAmYXV0bz1mb3JtYXQmZml0PWNyb3AnLFxuICAgICAgICAgICAgICAgICdodHRwczovL2ltYWdlcy51bnNwbGFzaC5jb20vcGhvdG8tMTYxODAwNTE5ODE0My1lNTI4MzQ2ZDlhNTk/cT04MCZ3PTYwMCZhdXRvPWZvcm1hdCZmaXQ9Y3JvcCcsXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNjA0ODcxMDAwNjM2LTA3NGZhNTExNzk0NT9xPTgwJnc9NjAwJmF1dG89Zm9ybWF0JmZpdD1jcm9wJ1xuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgIGNvbnN0IHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcGxhY2Vob2xkZXJzLmxlbmd0aClcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDBcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgdGh1bWJuYWlsOiBwbGFjZWhvbGRlcnNbcmFuZG9tSW5kZXhdIH0pKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbmV4dCgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzUyxTQUFTLGNBQWMsZUFBZTtBQUM1VSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZ0JBQWdCO0FBQ3pCLFNBQVMsa0JBQWtCO0FBTDNCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBRXhDLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUUzQyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsSUFDZDtBQUFBLElBQ0EsV0FBVyxDQUFDLFNBQVMsY0FBYztBQUFBLElBQ25DLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxRQUNwQyxRQUFRLEtBQUssUUFBUSxrQ0FBVyxjQUFjO0FBQUEsUUFDOUMsWUFBWSxLQUFLLFFBQVEsa0NBQVcsa0JBQWtCO0FBQUEsUUFDdEQsVUFBVSxLQUFLLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQUEsUUFD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b0JBQUksSUFBSSxLQUFLLFVBQVU7QUFBQSxrQkFDckIsV0FBVyxhQUFhO0FBQUEsa0JBQ3hCLFVBQVUsYUFBYTtBQUFBLGtCQUN2QixTQUFTLGFBQWEsV0FBVztBQUFBLGdCQUNuQyxDQUFDLENBQUM7QUFDRjtBQUFBLGNBQ0Y7QUFHQSxvQkFBTSxRQUFRLElBQUksc0NBQXNDLElBQUk7QUFFNUQsa0JBQUksT0FBTztBQUNULHNCQUFNLFlBQVkseURBQXlELG1CQUFtQixHQUFHLENBQUMsaUJBQWlCLEtBQUs7QUFDeEgsc0JBQU0saUJBQWlCLE1BQU0sTUFBTSxTQUFTO0FBQzVDLG9CQUFJLGVBQWUsSUFBSTtBQUNyQix3QkFBTSxPQUFPLE1BQU0sZUFBZSxLQUFLO0FBQ3ZDLHNCQUFJLEtBQUssZUFBZTtBQUN0Qix3QkFBSSxhQUFhO0FBQ2pCLHdCQUFJLFVBQVUsZ0JBQWdCLGtCQUFrQjtBQUNoRCx3QkFBSSxJQUFJLEtBQUssVUFBVTtBQUFBLHNCQUNyQixXQUFXLEtBQUs7QUFBQSxzQkFDaEIsVUFBVSxLQUFLLGVBQWU7QUFBQSxzQkFDOUIsU0FBUyxLQUFLLFNBQVM7QUFBQSxvQkFDekIsQ0FBQyxDQUFDO0FBQ0Y7QUFBQSxrQkFDRjtBQUFBLGdCQUNGO0FBQUEsY0FDRjtBQUdBLG9CQUFNLGNBQWMsS0FBSyxNQUFNLEtBQUssT0FBTyxJQUFJLGFBQWEsTUFBTTtBQUNsRSxrQkFBSSxhQUFhO0FBQ2pCLGtCQUFJLFVBQVUsZ0JBQWdCLGtCQUFrQjtBQUNoRCxrQkFBSSxJQUFJLEtBQUssVUFBVSxFQUFFLFdBQVcsYUFBYSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQUEsWUFDbEUsU0FBUyxLQUFLO0FBQ1osb0JBQU0sZUFBZTtBQUFBLGdCQUNuQjtBQUFBLGdCQUNBO0FBQUEsZ0JBQ0E7QUFBQSxnQkFDQTtBQUFBLGNBQ0Y7QUFDQSxvQkFBTSxjQUFjLEtBQUssTUFBTSxLQUFLLE9BQU8sSUFBSSxhQUFhLE1BQU07QUFDbEUsa0JBQUksYUFBYTtBQUNqQixrQkFBSSxVQUFVLGdCQUFnQixrQkFBa0I7QUFDaEQsa0JBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxXQUFXLGFBQWEsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUFBLFlBQ2xFO0FBQ0E7QUFBQSxVQUNGO0FBRUEsZUFBSztBQUFBLFFBQ1AsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
