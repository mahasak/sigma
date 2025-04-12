/* eslint-disable @typescript-eslint/no-unused-vars */
import { json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import Snowflakify from 'snowflakify';

export default function NewPage() {
  const params = useParams();
  
  return (
    <>
    <h1>My Test Order</h1>
    </>
  );
}