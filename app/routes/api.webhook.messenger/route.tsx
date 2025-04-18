/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ActionFunctionArgs } from "@remix-run/node";
import Snowflakify from 'snowflakify';

const snowflakify = new Snowflakify();
const APP_PAGE_ID = process.env.PAGE_ID ?? "";

export async function loader({ request }) {
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
        console.log("config page id:", APP_PAGE_ID);
        // Handle changes
        if (entry.changes) {
          for (const change of entry.changes) {
            console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
            console.log("Webhook changes:", change);
            console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');

            await handleChanges(change);
          }

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
    if (receivedMessage.text.startsWith('#invoice') || receivedMessage.text.startsWith('#pancake')) {
      console.log('send invoice');
      const invoice_id = snowflakify.nextHexId();

      const link = receivedMessage.text.startsWith('#pancake')
        ? 'https://order.pke.gg/payment?id=RyvKXPdNWkGlh2Wk8g70JpnHa5li8j2UDjToTHOErON0hZ5QgjMFwpCtgdQXxxFV4UuXGnZbRi3qae3VTTuXlnR9lo4%3D'
        : `https://sigma.femto.sh/invoice?external_id=${invoice_id}`;

      const payload = {
        "recipient": {
          "id": senderPsid
        },
        "message": {
          "attachment": {
            "type": "template",
            "payload": {
              "template_type": "button",
              "text": `You received order ID: ${invoice_id}`,
              "buttons": [
                {
                  "type": "web_url",
                  "url": link,
                  "title": "View order",
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

async function handleChanges(change: any) {
  if (change.field === 'invoice_access_bank_slip_events') {
    const psid = change.value.buyer_id;
    const page_id = change.value.page_id;
    const ref_id = change.value.app_switch_reference_id;
    const external_id = change.value.external_id;

    const response = {
      "text": "Received payment notification\n"
        + `-=-=-=-=-=-=-=-=-=-\n`
        + `Order id: ${external_id}\n`
        + `AppSwitch Ref ID: ${ref_id}\n`
    };

    await callSendAPI(psid, response);

    await genPaymentDetails(page_id, psid,external_id, ref_id);
  }

}

async function genPaymentDetails(page_id: string, psid: string, order_id:string, ref_id: string) {
  const ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN ?? "";
  try {
    const url = `https://graph.facebook.com/v18.0/${page_id}/invoice_access_invoice_status?invoice_id=${ref_id}&access_token=${ACCESS_TOKEN}`;

    console.log(url);
    // Send the HTTP request to the Messenger Platform
    const res = await fetch(url, {
      method: "GET",
    });

    const data = await res.json();
    
    const external_id = data.data[0].invoice_id;
    const invoice_status = data.data[0].invoice_status;
    const bank_account_number = data.data[0].bank_account_number;
    const bank_code = data.data[0].bank_code;
    const transfer_slip = data.data[0].transfer_slip;
    const amount = parseInt(data.data[0].payout_amount.amount)/100;
    const payout_amount = `${amount} ${data.data[0].payout_amount.currency}`;

    const response = {
      "text": "Confirmed payment\n"
        + `-=-=-=-=-=-=-=-=-=-\n`
        + `Order id: ${order_id}\n`
        + `AppSwitch Ref ID: ${external_id}\n`
        + `-=-=-=-=-=-=-=-=-=-\n`
        + `Bank code: ${bank_code}\n`
        + `A/C no: ${bank_account_number}\n`
        + `amount: ${payout_amount}\n`
        + `Status: ${invoice_status}\n`
    };

    await callSendAPI(psid, response);

    const response_before_slip = {
      "text": "Slip Image received"
    };

    await callSendAPI(psid, response_before_slip);

    await sendSlipImage(psid, transfer_slip);

  } catch (error) {
    console.error("Unable to send message:", error);
  }
}

async function sendSlipImage(recipientId: string, base64Image: string) {
  const ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN ?? "";

  // Convert base64 to Blob

  // Remove the data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, ''); 
  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  const blob = new Blob(byteArrays, { type: 'image/jpeg' }); // Adjust MIME type as needed
  
  // Create FormData and append necessary data
  const formData = new FormData();
  formData.append('recipient', JSON.stringify({ id: recipientId }));
  formData.append('message', JSON.stringify({
    attachment: {
      type: 'image',
      payload: {
        is_reusable: true
      }
    }
  }));
  
  // Append the image blob as a file
  formData.append('filedata', blob, 'bank_slip.jpg');
  
  // Send the request
  const response = await fetch(`https://graph.facebook.com/v16.0/${APP_PAGE_ID}/messages?access_token=${ACCESS_TOKEN}`, {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
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
  // Construct the message body
  const requestBody = {
    "recipient": {
      "id": senderPsid
    },
    "message": response
  };

  try {
    // Send the HTTP request to the Messenger Platform
    const res = await fetch(`https://graph.facebook.com/v18.0/${APP_PAGE_ID}/messages?access_token=${ACCESS_TOKEN}`, {
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
    const res = await fetch(`https://graph.facebook.com/v18.0/${APP_PAGE_ID}/messages?access_token=${ACCESS_TOKEN}`, {
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
