const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT_DIR = __dirname;
const DEFAULT_PORT = 8123;
const DEFAULT_HOST = "127.0.0.1";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function isInsideRoot(targetPath) {
  return targetPath === ROOT_DIR || targetPath.startsWith(ROOT_DIR + path.sep);
}

function getFilePathFromUrl(requestUrl) {
  const parsedUrl = new URL(requestUrl, "http://127.0.0.1");
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const absolutePath = path.resolve(ROOT_DIR, "." + normalizedPath);
  return {
    pathname,
    absolutePath,
  };
}

function sendResponse(response, statusCode, headers, body) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

function buildHashRedirectTarget(requestUrl) {
  const parsedUrl = new URL(requestUrl, "http://127.0.0.1");
  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const route = segments[segments.length - 1] || "";
  let target = "/";
  if (route && route !== "index.html") {
    target += "#" + route;
  }
  if (parsedUrl.search) {
    target += parsedUrl.search;
  }
  return target;
}

function serveFile(response, absolutePath) {
  const extension = path.extname(absolutePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  const fileStream = fs.createReadStream(absolutePath);
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
  });
  fileStream.pipe(response);
  fileStream.on("error", function handleStreamError() {
    sendResponse(response, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Failed to read file.");
  });
}

function shouldServeSpaFallback(pathname) {
  return path.extname(pathname) === "";
}

const server = http.createServer(function handleRequest(request, response) {
  const resolved = getFilePathFromUrl(request.url || "/");
  const pathname = resolved.pathname;
  const absolutePath = resolved.absolutePath;

  if (!isInsideRoot(absolutePath)) {
    sendResponse(response, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }

  fs.stat(absolutePath, function handleStat(statError, stats) {
    if (!statError && stats.isFile()) {
      serveFile(response, absolutePath);
      return;
    }

    if (shouldServeSpaFallback(pathname)) {
      sendResponse(response, 302, { Location: buildHashRedirectTarget(request.url || "/") }, "");
      return;
    }

    sendResponse(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
  });
});

const requestedPort = Number(process.env.PORT) || DEFAULT_PORT;
const requestedHost = process.env.HOST || DEFAULT_HOST;

server.listen(requestedPort, requestedHost, function handleListen() {
  console.log("BOSS static server running at http://" + requestedHost + ":" + requestedPort + "/");
});
