import { ActionFunctionArgs, json } from "@remix-run/node";
import { getServerTiming, time } from "../../timing.server";

export async function loader() {
  const { time, getServerTimingHeader } = getServerTiming()

  await time(
    {
      name: "content",
      description: "Compile",
    },
    () => {},
  );

 return Response.json(
  { text: 'Hello' },
  {
    headers: getServerTimingHeader(),
  },);
}


export async function action({ request }: ActionFunctionArgs) {
  const { time, getServerTimingHeader } = getServerTiming()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const body = await request.formData();

  await time(
    {
      name: "content",
      description: "Compile",
    },
    () => {},
  );

 return Response.json(
  { text: 'Hello' },{
    headers: getServerTimingHeader(),
  }
 );
}
