import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable, json } from "@remix-run/node";
import { RemixServer, Outlet, Meta, Links, ScrollRestoration, Scripts, useLoaderData, useParams } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import Snowflakify from "snowflakify";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  return isbot(request.headers.get("user-agent") || "") ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
  }
];
function Layout({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function App() {
  return /* @__PURE__ */ jsx(Outlet, {});
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Layout,
  default: App,
  links
}, Symbol.toStringTag, { value: "Module" }));
async function loader$3({ request }) {
  const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? "";
  const url = new URL(request.url);
  const mode2 = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  console.log("Webhook verification:", { mode: mode2, token });
  if (VERIFY_TOKEN === "") {
    console.log("No verify token setup");
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        "Content-Type": "text/plain",
        "Allow": "GET, POST"
        // Specify which methods are allowed
      }
    });
  }
  if (mode2 === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  } else {
    console.log("Webhook verification failed");
    return new Response("Verification failed", {
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
async function action({ request }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        "Allow": "POST",
        "Content-Type": "text/plain"
      }
    });
  }
  try {
    const body = await request.json();
    if (body.object === "page") {
      for (const entry2 of body.entry) {
        if (entry2.messaging) {
          for (const webhookEvent of entry2.messaging) {
            console.log("Webhook event:", webhookEvent);
            const senderPsid = webhookEvent.sender.id;
            if (webhookEvent.message) {
              await handleMessage(senderPsid, webhookEvent.message);
            } else if (webhookEvent.postback) {
              await handlePostback(senderPsid, webhookEvent.postback);
            }
          }
        }
      }
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    } else {
      return new Response("Not a page subscription", {
        status: 404,
        headers: { "Content-Type": "text/plain" }
      });
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
async function handleMessage(senderPsid, receivedMessage) {
  if (receivedMessage.text) {
    ({
      "text": `You sent: "${receivedMessage.text}". Now send me an attachment!`
    });
  } else if (receivedMessage.attachments) {
    receivedMessage.attachments[0].payload.url;
  }
}
async function handlePostback(senderPsid, receivedPostback) {
  receivedPostback.payload;
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
async function loader$2({ request }) {
  const snowflakify = new Snowflakify();
  const url = new URL(request.url);
  const external_id = url.searchParams.get("external_id") || snowflakify.nextHexId();
  const seller_id = url.searchParams.get("seller_id") || "381857821686798";
  const bank_code = url.searchParams.get("bank_code") || "004";
  const bank_account = url.searchParams.get("bank_account") || "7302973231";
  const amount = url.searchParams.get("amount") || "20";
  return json({
    message: "Please pay to this order!",
    seller_id,
    external_id,
    bank_code,
    bank_account,
    amount
  });
}
function NewPage$1() {
  const data = useLoaderData();
  useParams();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("h1", { children: "My Test Order" }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { children: data.message }),
      /* @__PURE__ */ jsxs("span", { children: [
        "Order ID: ",
        data.external_id
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsxs("span", { children: [
        "Seller ID: ",
        data.seller_id
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsxs("span", { children: [
        "Bank code: ",
        data.bank_code
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsxs("span", { children: [
        "Bank account: ",
        data.bank_account
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsxs("span", { children: [
        "Amount: ",
        data.amount
      ] }),
      /* @__PURE__ */ jsx("br", {})
    ] }),
    /* @__PURE__ */ jsxs("div", { id: "meta-appswitch", style: { display: "none" }, children: [
      /* @__PURE__ */ jsx("div", { id: "seller_id", children: data.seller_id }),
      /* @__PURE__ */ jsx("div", { id: "external_id", children: data.external_id }),
      /* @__PURE__ */ jsx("div", { id: "bank_code", children: data.bank_code }),
      /* @__PURE__ */ jsx("div", { id: "bank_account", children: data.bank_account }),
      /* @__PURE__ */ jsx("div", { id: "amount", children: data.amount })
    ] })
  ] });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: NewPage$1,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
function getServerTiming() {
  const serverTimings = {};
  return {
    time(serverTiming, fn) {
      return time(serverTimings, serverTiming, fn);
    },
    getHeaderField() {
      return getServerTimeHeaderField(serverTimings);
    },
    getServerTimingHeader() {
      return {
        "Server-Timing": getServerTimeHeaderField(serverTimings)
      };
    }
  };
}
async function time(serverTimings, serverTimingParam, fn) {
  const start = performance.now();
  const name = typeof serverTimingParam === "string" ? serverTimingParam : serverTimingParam.name;
  const description = typeof serverTimingParam === "string" ? "" : serverTimingParam.description;
  if (!serverTimings[name]) {
    serverTimings[name] = [];
  }
  let result;
  try {
    result = typeof fn === "function" ? await fn() : await fn;
  } catch (error) {
    void recordServerTiming(serverTimings, {
      name,
      description: "Error"
    });
    throw error;
  }
  void recordServerTiming(serverTimings, {
    name,
    description,
    duration: performance.now() - start
  });
  return result;
}
function recordServerTiming(serverTimings, timing) {
  const serverTiming = {
    name: timing.name,
    description: timing.description ?? "",
    duration: timing.duration ?? 0,
    toJSON() {
      return JSON.parse(JSON.stringify(serverTiming));
    }
  };
  serverTimings[timing.name].push(serverTiming);
}
function getServerTimeHeaderField(serverTimings) {
  return Object.entries(serverTimings).map(([name, timingInfos]) => {
    const dur = timingInfos.reduce((totalDuration, { duration }) => totalDuration + duration, 0).toFixed(3);
    const desc = timingInfos.map(({ description }) => description).filter(Boolean).join(" & ");
    return [
      name.replaceAll(/(:| |@|=|;|,)/g, "_"),
      // desc and dur are both optional
      desc ? `desc=${JSON.stringify(desc)}` : null,
      dur ? `dur=${dur}` : null
    ].filter(Boolean).join(";");
  }).join(",");
}
async function loader$1() {
  const { time: time2, getServerTimingHeader } = getServerTiming();
  await time2(
    {
      name: "content",
      description: "Compile"
    },
    // eslint-disable-next-line no-unused-labels
    () => {
    }
  );
  return Response.json(
    { text: "Hello" },
    {
      headers: getServerTimingHeader()
    }
  );
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
async function loader({ request }) {
  const snowflakify = new Snowflakify();
  const url = new URL(request.url);
  const external_id = url.searchParams.get("external_id") || snowflakify.nextHexId();
  const seller_id = url.searchParams.get("seller_id") || "381857821686798";
  const bank_code = url.searchParams.get("bank_code") || "004";
  const bank_account = url.searchParams.get("bank_account") || "7302973231";
  const amount = url.searchParams.get("amount") || "20";
  return json({
    message: "Please pay to this order!",
    seller_id,
    external_id,
    bank_code,
    bank_account,
    amount
  });
}
function NewPage() {
  const data = useLoaderData();
  useParams();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("h1", { children: "My Test Order" }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { children: data.message }),
      /* @__PURE__ */ jsxs("span", { children: [
        "Order ID: ",
        data.external_id
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsxs("span", { children: [
        "Seller ID: ",
        data.seller_id
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsxs("span", { children: [
        "Bank code: ",
        data.bank_code
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsxs("span", { children: [
        "Bank account: ",
        data.bank_account
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsxs("span", { children: [
        "Amount: ",
        data.amount
      ] }),
      /* @__PURE__ */ jsx("br", {})
    ] }),
    /* @__PURE__ */ jsxs("div", { id: "meta-appswitch", style: { display: "none" }, children: [
      /* @__PURE__ */ jsx("div", { id: "seller_id", children: data.seller_id }),
      /* @__PURE__ */ jsx("div", { id: "external_id", children: data.external_id }),
      /* @__PURE__ */ jsx("div", { id: "bank_code", children: data.bank_code }),
      /* @__PURE__ */ jsx("div", { id: "bank_account", children: data.bank_account }),
      /* @__PURE__ */ jsx("div", { id: "amount", children: data.amount })
    ] })
  ] });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: NewPage,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-DrmCk0ox.js", "imports": ["/assets/components-CQTjDfHr.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-Ch9VWX-5.js", "imports": ["/assets/components-CQTjDfHr.js"], "css": ["/assets/root-BG7Jttxy.css"] }, "routes/api.webhook.messenger": { "id": "routes/api.webhook.messenger", "parentId": "root", "path": "api/webhook/messenger", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/invoice._index": { "id": "routes/invoice._index", "parentId": "root", "path": "invoice", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/invoice._index-BrxSPubU.js", "imports": ["/assets/components-CQTjDfHr.js"], "css": [] }, "routes/hello._index": { "id": "routes/hello._index", "parentId": "root", "path": "hello", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/hello._index-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-BrxSPubU.js", "imports": ["/assets/components-CQTjDfHr.js"], "css": [] } }, "url": "/assets/manifest-b85e8218.js", "version": "b85e8218" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": true, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/api.webhook.messenger": {
    id: "routes/api.webhook.messenger",
    parentId: "root",
    path: "api/webhook/messenger",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/invoice._index": {
    id: "routes/invoice._index",
    parentId: "root",
    path: "invoice",
    index: true,
    caseSensitive: void 0,
    module: route2
  },
  "routes/hello._index": {
    id: "routes/hello._index",
    parentId: "root",
    path: "hello",
    index: true,
    caseSensitive: void 0,
    module: route3
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route4
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
