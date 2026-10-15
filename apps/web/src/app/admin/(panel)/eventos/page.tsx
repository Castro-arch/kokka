import { redirect } from "next/navigation";

/** The events list lives on the admin home now. */
export default function EventsRedirect() {
  redirect("/admin");
}
