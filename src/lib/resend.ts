import { Resend } from "resend";

let _client: Resend | null = null;
export function resend() {
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY);
  }
  return _client;
}

export function fromEmail() {
  return process.env.RESEND_FROM_EMAIL || "AiMS Institute <invitations@aims.example>";
}
