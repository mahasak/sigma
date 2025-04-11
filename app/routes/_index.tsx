/* eslint-disable @typescript-eslint/no-unused-vars */
import { json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import Snowflakify from 'snowflakify';

export async function loader({ request }) {
  const snowflakify = new Snowflakify();
  const url = new URL(request.url);

  const external_id = url.searchParams.get("external_id") || snowflakify.nextHexId();
  const seller_id = url.searchParams.get("seller_id") || "381857821686798";
  const bank_code = url.searchParams.get("bank_code") || "004";
  const bank_account = url.searchParams.get("bank_account") || "7302973231";
  const amount = url.searchParams.get("amount") || "20";

  return json({ 
    message: "Please pay to this order!",
    seller_id: seller_id,
    external_id: external_id,
    bank_code: bank_code,
    bank_account: bank_account,
    amount: amount,
  });
}

interface InvoiceParam {
  message: string | null;
  seller_id: string | null;
  external_id: string | null;
  bank_code: string | null;
  bank_account: string | null;
  amount: string | null;
}

export default function NewPage() {
  const data = useLoaderData<InvoiceParam>();
  const params = useParams();
  
  return (
    <>
    <h1>My Test Order</h1>
    </>
  );
}