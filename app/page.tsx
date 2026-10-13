import { redirect } from "next/navigation";

export default function Inicio() {
  redirect("/operaciones"); // el middleware manda a /login si no hay sesión
}
