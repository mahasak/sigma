import { getServerTiming } from "../../timing.server";

export async function loader() {
  const { time, getServerTimingHeader } = getServerTiming()

  await time(
    {
      name: "content",
      description: "Compile",
    },
    // eslint-disable-next-line no-unused-labels
    () => {},
  );

 return Response.json(
  { text: 'Hello' },
  {
    headers: getServerTimingHeader(),
  },);
}