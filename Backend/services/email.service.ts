export async function sendEmail(_to:string,_subject:string,_text:string) {
 // Configure an email provider (Resend, SendGrid, SES, etc.) before enabling transactional email.
 if(process.env.NODE_ENV==="production") console.warn("Email provider is not configured; email was not sent.");
 return {sent:false,reason:"Email provider not configured"};
}
