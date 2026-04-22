import { redirect } from "next/navigation"

export default function MyTasksRedirect() {
  redirect("/admin/to-do")
}
