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
    merchant: {
      name: "SIGMA APP",
      address: "123 Business Ave, Suite 100",
      city: "San Francisco, CA 94107",
      email: "billing@acmecorp.com",
      phone: "+1 (555) 123-4567",
      website: "www.acmecorp.com",
      logo: "/images/logo.png",
    },
    buyer: {
      name: "John Doe",
      company: "Doe Enterprises",
      address: "456 Customer Lane",
      city: "New York, NY 10001",
      email: "john@doeenterprises.com",
      phone: "+1 (555) 987-6543",
    },
    order: {
      invoiceNumber: external_id,
      date: "April 12, 2025",
      dueDate: "May 12, 2025",
      items: [
        { description: "Item 1", quantity: 1, price: 20 },
      ],
      subtotal: 20,
      tax: 0,
      total: 20,
    },
    payment: {
      bankName: "KASIKORN BANK",
      accountName: "MERCHANT ACCOUNT",
      accountNumber: bank_account,
      seller_id: seller_id,
      external_id: external_id,
      bank_code: bank_code,
      bank_account: bank_account,
      amount: amount,
    },
  })
}

interface InvoiceParam {
  message: string | null;
  seller_id: string | null;
  external_id: string | null;
  bank_code: string | null;
  bank_account: string | null;
  amount: string | null;
  merchant: {
    name: string | null;
    address: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    logo: string | null;
  },
  order: {
    invoiceNumber: string | null;
    date: string | null;
    dueDate: string | null;
    items: [
      { 
        description: string | null;
        quantity: number;
        price: number;
      }
    ],
    subtotal: number,
    tax: number,
    total: number,
  },
  buyer: {
    name: string | null;
    company: string | null;
    address: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
  },
  payment: {
    bankName: string | null;
      accountName: string | null;
      accountNumber: string | null;
      routingNumber: string | null;
      swiftCode: string | null;
      seller_id: string | null;
      external_id: string | null;
      bank_code: string | null;
      bank_account: string | null;
      amount: string | null;
  }
}

export const handle = {
  hydrate: false
};

export default function Invoice() {
  "use server";
  const data = useLoaderData<InvoiceParam>();

  return (
    <div className="bg-gray-100 min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">

        {/* Invoice Header */}
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start">
            <div className="mb-4 md:mb-0">
              <div className="h-12 w-12 bg-gray-200 rounded-md mb-2">
                {/* Logo placeholder */}
                <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold">LOGO</div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{data.merchant.name}</h1>
              <p className="text-gray-600">{data.merchant.address}</p>
              <p className="text-gray-600">{data.merchant.city}</p>
              <p className="text-gray-600">{data.merchant.email}</p>
              <p className="text-gray-600">{data.merchant.phone}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <h2 className="text-xl font-bold text-gray-800 mb-2">INVOICE</h2>
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-gray-600">Invoice:</span>
                  <span>{data.order.invoiceNumber}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-gray-600">Date:</span>
                  <span>{data.order.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Due Date:</span>
                  <span>{data.order.dueDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Bill To:</h2>
          <div className="text-gray-700">
            <p className="font-medium">{data.buyer.name}</p>
            <p>{data.buyer.company}</p>
            <p>{data.buyer.address}</p>
            <p>{data.buyer.city}</p>
            <p>{data.buyer.email}</p>
            <p>{data.buyer.phone}</p>
          </div>
        </div>

        {/* Order Information */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Order Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-2 px-3 text-left font-semibold text-gray-700">Description</th>
                  <th className="py-2 px-3 text-right font-semibold text-gray-700">Qty</th>
                  <th className="py-2 px-3 text-right font-semibold text-gray-700">Price</th>
                  <th className="py-2 px-3 text-right font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.order.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 px-3 text-gray-700">{item.description}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{item.price.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-300">
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right font-medium text-gray-700">
                    Subtotal
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-gray-700">{data.order.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right font-medium text-gray-700">
                    Tax (10%)
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-gray-700">{data.order.tax.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="py-2 px-3 text-right font-bold text-gray-800">
                    Total
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-gray-800">{data.order.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Payment Instructions</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Bank Name</p>
                <p className="text-gray-800">{data.payment.bankName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Account Name</p>
                <p className="text-gray-800">{data.payment.accountName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Account Number</p>
                <p className="text-gray-800">{data.payment.accountNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Bank Code</p>
                <p className="text-gray-800">{data.payment.bank_code}</p>
              </div>
            </div>
          </div>
        </div>

        <div id="meta-appswitch" style={{display:'none'}}>
          {/* @ts-expect-error Custom data attribute */}
          <div id="seller_id" data={data.seller_id}>{data.seller_id}</div>
          {/* @ts-expect-error Custom data attribute */}
          <div id="external_id" data={data.external_id}>{data.external_id}</div>
          {/* @ts-expect-error Custom data attribute */}
          <div id="bank_code" data={data.bank_code}>{data.bank_code}</div>
          {/* @ts-expect-error Custom data attribute */}
          <div id="bank_account" data={data.bank_account}>{data.bank_account}</div>
          {/* @ts-expect-error Custom data attribute */}
          <div id="amount" data={data.amount}>{data.amount}</div>
        </div>
        {/* Footer */}
        <div className="p-6 text-center text-gray-600 text-sm">
          <p>Thank you for your business!</p>
          <p className="mt-1">If you have any questions, please contact us at {data.merchant.email}</p>
        </div>
      </div>
    </div>
  )
}
