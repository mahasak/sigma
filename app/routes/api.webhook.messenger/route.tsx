/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ActionFunctionArgs } from "@remix-run/node";
import Snowflakify from 'snowflakify';

const snowflakify = new Snowflakify();

export async function loader({request}) {
  const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? "";

  const url = new URL(request.url);

  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  console.log("Webhook verification:", { mode, token });

  if (VERIFY_TOKEN === "") {
    console.log("No verify token setup");
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        "Content-Type": "text/plain",
        "Allow": "GET, POST" // Specify which methods are allowed
      }
    });
  }

  // Verify the webhook
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
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


export async function action({ request }: ActionFunctionArgs) {
  // Check if this is a POST request
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        "Allow": "POST",
        "Content-Type": "text/plain"
      }
    });
  }


  const APP_PAGE_ID = process.env.PAGE_ID ?? "";

  try {
    // Parse the request body
    const body = await request.json();
    
    // Make sure this is a page subscription
    if (body.object === 'page') {
      console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
      console.log(body);
      console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
      // Iterate over each entry - there may be multiple if batched
      for (const entry of body.entry) {
        const page_id = entry.id;
        console.log("page id:", page_id);
        
        if(entry.changes) {
          console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
          console.log("Webhook changes:",entry.changes);
          console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
        }
        // Handle each messaging event
        if (page_id === APP_PAGE_ID && entry.messaging) {
          for (const webhookEvent of entry.messaging) {
            console.log("Webhook event:", webhookEvent);
            
            // Get the sender PSID
            const senderPsid = webhookEvent.sender.id;
            
            // Handle messages
            if (senderPsid !== APP_PAGE_ID && webhookEvent.message) {
              await handleMessage(senderPsid, webhookEvent.message);
            } 
            // Handle postbacks
            else if (senderPsid !== APP_PAGE_ID && webhookEvent.postback) {
              await handlePostback(senderPsid, webhookEvent.postback);
            }
          }
        }
      }
      
      // Return a '200 OK' response to all events
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    } else {
      // Not a page subscription
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

async function handleMessage(senderPsid: string, receivedMessage: any) {
  let response;
  
  // Check if the message contains text
  if (receivedMessage.text) {
    if (receivedMessage.text.startsWith('#invoice')) {
      console.log('send invoice');
      const invoice_id = snowflakify.nextHexId();
      const payload = {
        "recipient":{
          "id":"7543714042334599"
        },
        "message":{
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"button",
              "text": `You received order ID: ${invoice_id}`,
              "buttons":[
                {
                  "type":"web_url",
                  "url":`https://sigma.femto.sh/invoice?external_id=${invoice_id}`,
                  "title":"View order",
                  "webview_height_ratio": "full",
                  "messenger_extensions": "false"
                }
              ]
            }
          }
        }
      }
      await sendButtonTemplate(payload);
    }
  } else if (receivedMessage.attachments) {
    // Gets the URL of the message attachment
    const attachmentUrl = receivedMessage.attachments[0].payload.url;
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to respond.",
            "image_url": attachmentUrl,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no",
              }
            ],
          }]
        }
      }
    };
  }  
  // Sends the response message
  // await callSendAPI(senderPsid, response);
}

async function handlePostback(senderPsid: string, receivedPostback: any) {
  let response;
  
  // Get the payload for the postback
  const payload = receivedPostback.payload;
  
  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Thanks!" };
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." };
  }
  
  // Send the message to acknowledge the postback
  // await callSendAPI(senderPsid, response);
}

async function callSendAPI(senderPsid: string, response: any) {
  const ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN ?? "";
  console.log("token", ACCESS_TOKEN);
  // Construct the message body
  const requestBody = {
    "recipient": {
      "id": senderPsid
    },
    "message": response
  };
  
  try {
    // Send the HTTP request to the Messenger Platform
    const res = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    
    const data = await res.json();
    console.log("Message sent successfully:", data);
  } catch (error) {
    console.error("Unable to send message:", error);
  }
}

async function sendButtonTemplate(payload: any) {
  const ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN ?? "";
  
  try {
    // Send the HTTP request to the Messenger Platform
    const res = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("Message sent successfully:", data);
  } catch (error) {
    console.error("Unable to send message:", error);
  }
}
