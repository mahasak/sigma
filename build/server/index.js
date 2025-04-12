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
    amount,
    merchant: {
      name: "Acme Corporation",
      address: "123 Business Ave, Suite 100",
      city: "San Francisco, CA 94107",
      email: "billing@acmecorp.com",
      phone: "+1 (555) 123-4567",
      website: "www.acmecorp.com",
      logo: "/images/logo.png"
    },
    buyer: {
      name: "John Doe",
      company: "Doe Enterprises",
      address: "456 Customer Lane",
      city: "New York, NY 10001",
      email: "john@doeenterprises.com",
      phone: "+1 (555) 987-6543"
    },
    order: {
      invoiceNumber: external_id,
      date: "April 12, 2025",
      dueDate: "May 12, 2025",
      items: [
        { description: "Website Development", quantity: 1, price: 20 }
      ],
      subtotal: 20,
      tax: 0,
      total: 20
    },
    payment: {
      bankName: "First National Bank",
      accountName: "Acme Corporation",
      accountNumber: "1234567890",
      routingNumber: "987654321",
      swiftCode: "FNBAUS12",
      seller_id,
      external_id,
      bank_code,
      bank_account,
      amount
    }
  });
}
const handle = {
  hydrate: false
};
function Invoice() {
  const data = useLoaderData();
  useParams();
  return /* @__PURE__ */ jsx("div", { "data-no-hydrate": true, className: "bg-gray-100 min-h-screen py-8 px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden", children: [
    /* @__PURE__ */ jsx("div", { className: "p-6 border-b", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row justify-between items-start", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-4 md:mb-0", children: [
        /* @__PURE__ */ jsx("div", { className: "h-12 w-12 bg-gray-200 rounded-md mb-2", children: /* @__PURE__ */ jsx("div", { className: "h-full w-full flex items-center justify-center text-gray-500 font-bold", children: "LOGO" }) }),
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-800", children: data.merchant.name }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600", children: data.merchant.address }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600", children: data.merchant.city }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600", children: data.merchant.email }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600", children: data.merchant.phone })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 p-4 rounded-md", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-gray-800 mb-2", children: "INVOICE" }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-600", children: "Invoice Number:" }),
            /* @__PURE__ */ jsx("span", { children: data.order.invoiceNumber })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-600", children: "Date:" }),
            /* @__PURE__ */ jsx("span", { children: data.order.date })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-600", children: "Due Date:" }),
            /* @__PURE__ */ jsx("span", { children: data.order.dueDate })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "p-6 border-b", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-gray-800 mb-3", children: "Bill To:" }),
      /* @__PURE__ */ jsxs("div", { className: "text-gray-700", children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium", children: data.buyer.name }),
        /* @__PURE__ */ jsx("p", { children: data.buyer.company }),
        /* @__PURE__ */ jsx("p", { children: data.buyer.address }),
        /* @__PURE__ */ jsx("p", { children: data.buyer.city }),
        /* @__PURE__ */ jsx("p", { children: data.buyer.email }),
        /* @__PURE__ */ jsx("p", { children: data.buyer.phone })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-6 border-b", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-gray-800 mb-4", children: "Order Details" }),
      /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-gray-50", children: [
          /* @__PURE__ */ jsx("th", { className: "py-2 px-3 text-left font-semibold text-gray-700", children: "Description" }),
          /* @__PURE__ */ jsx("th", { className: "py-2 px-3 text-right font-semibold text-gray-700", children: "Qty" }),
          /* @__PURE__ */ jsx("th", { className: "py-2 px-3 text-right font-semibold text-gray-700", children: "Price" }),
          /* @__PURE__ */ jsx("th", { className: "py-2 px-3 text-right font-semibold text-gray-700", children: "Amount" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-gray-200", children: data.order.items.map((item, index) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { className: "py-3 px-3 text-gray-700", children: item.description }),
          /* @__PURE__ */ jsx("td", { className: "py-3 px-3 text-right text-gray-700", children: item.quantity }),
          /* @__PURE__ */ jsx("td", { className: "py-3 px-3 text-right text-gray-700", children: item.price.toFixed(2) }),
          /* @__PURE__ */ jsx("td", { className: "py-3 px-3 text-right text-gray-700", children: (item.quantity * item.price).toFixed(2) })
        ] }, index)) }),
        /* @__PURE__ */ jsxs("tfoot", { className: "border-t border-gray-300", children: [
          /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { colSpan: 3, className: "py-2 px-3 text-right font-medium text-gray-700", children: "Subtotal" }),
            /* @__PURE__ */ jsx("td", { className: "py-2 px-3 text-right font-medium text-gray-700", children: data.order.subtotal.toFixed(2) })
          ] }),
          /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { colSpan: 3, className: "py-2 px-3 text-right font-medium text-gray-700", children: "Tax (10%)" }),
            /* @__PURE__ */ jsx("td", { className: "py-2 px-3 text-right font-medium text-gray-700", children: data.order.tax.toFixed(2) })
          ] }),
          /* @__PURE__ */ jsxs("tr", { className: "bg-gray-50", children: [
            /* @__PURE__ */ jsx("td", { colSpan: 3, className: "py-2 px-3 text-right font-bold text-gray-800", children: "Total" }),
            /* @__PURE__ */ jsx("td", { className: "py-2 px-3 text-right font-bold text-gray-800", children: data.order.total.toFixed(2) })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-6 border-b", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-gray-800 mb-3", children: "Payment Instructions" }),
      /* @__PURE__ */ jsx("div", { className: "bg-gray-50 p-4 rounded-md", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-600", children: "Bank Name" }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-800", children: data.payment.bankName })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-600", children: "Account Name" }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-800", children: data.payment.accountName })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-600", children: "Account Number" }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-800", children: data.payment.accountNumber })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-600", children: "Routing Number" }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-800", children: data.payment.routingNumber })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-600", children: "SWIFT Code" }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-800", children: data.payment.swiftCode })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { id: "meta-appswitch", style: { display: "none" }, children: [
      /* @__PURE__ */ jsx("div", { id: "seller_id", data: data.seller_id, children: data.seller_id }),
      /* @__PURE__ */ jsx("div", { id: "external_id", data: data.external_id, children: data.external_id }),
      /* @__PURE__ */ jsx("div", { id: "bank_code", data: data.bank_code, children: data.bank_code }),
      /* @__PURE__ */ jsx("div", { id: "bank_account", data: data.bank_account, children: data.bank_account }),
      /* @__PURE__ */ jsx("div", { id: "amount", data: data.amount, children: data.amount })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-6 text-center text-gray-600 text-sm", children: [
      /* @__PURE__ */ jsx("p", { children: "Thank you for your business!" }),
      /* @__PURE__ */ jsxs("p", { className: "mt-1", children: [
        "If you have any questions, please contact us at ",
        data.merchant.email
      ] })
    ] })
  ] }) });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Invoice,
  handle,
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
  useLoaderData();
  useParams();
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("h1", { children: "My Test Order" }) });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: NewPage,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-DrmCk0ox.js", "imports": ["/assets/components-CQTjDfHr.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-X9CjrVav.js", "imports": ["/assets/components-CQTjDfHr.js"], "css": ["/assets/root-DWqObA9w.css"] }, "routes/api.webhook.messenger": { "id": "routes/api.webhook.messenger", "parentId": "root", "path": "api/webhook/messenger", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/invoice._index": { "id": "routes/invoice._index", "parentId": "root", "path": "invoice", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/invoice._index-BDTfKjG_.js", "imports": ["/assets/components-CQTjDfHr.js"], "css": [] }, "routes/hello._index": { "id": "routes/hello._index", "parentId": "root", "path": "hello", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/hello._index-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-TZfhs18P.js", "imports": ["/assets/components-CQTjDfHr.js"], "css": [] } }, "url": "/assets/manifest-aeac2409.js", "version": "aeac2409" };
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
