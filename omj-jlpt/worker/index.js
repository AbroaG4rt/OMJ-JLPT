/**
 * OMOSHIROI JAPAN TEST PLATFORM - Cloudflare Worker
 * 
 * Handles receiving evaluation payloads from the frontend
 * and securely bridging them to an external email provider via API.
 * 
 * Configured via Cloudflare Dashboard Environment Variables:
 * - EMAIL_PROVIDER_API_KEY
 * - EMAIL_PROVIDER_URL (e.g., https://api.sendgrid.com/v3/mail/send)
 * - SENDER_EMAIL (e.g., noreply@omoshiroi-japan.com)
 * - DESTINATION_EMAIL (Default: ofc.omj.japan@gmail.com)
 */

export default {
    async fetch(request, env, ctx) {
      // Configuration overrides / ENV bindings
      const DESTINATION_EMAIL = env.DESTINATION_EMAIL || "ofc.omj.japan@gmail.com";
      const SENDER_EMAIL = env.SENDER_EMAIL || "no-reply@domain.com";
  
      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }
  
      // Ensure POST request
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), { 
          status: 405,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/send')) {
          return new Response(JSON.stringify({ error: "Endpoint not found." }), { status: 404 });
      }
  
      try {
        let payload;
        const contentType = request.headers.get("content-type") || "";
  
        // Handle Form Submission or raw JSON
        if (contentType.includes("application/json")) {
          payload = await request.json();
        } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const rawData = formData.get("payloadData");
          if (!rawData) {
            throw new Error("Missing payloadData in form submission.");
          }
          payload = JSON.parse(rawData);
        } else {
            throw new Error("Unsupported Content-Type.");
        }
  
        // Validate payload structure
        const { name, password, level, score, correctList, cheatProfile } = payload;
        if (!name || !level || correctList === undefined) {
          throw new Error("Invalid payload: Missing required fields (name, level, correctList).");
        }
  
        // Build an elegant HTML table for the email body
        const answerRows = correctList.map(id => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${id}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: green; font-weight: bold;">Correct</td>
          </tr>
        `).join("");
  
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
            <h2 style="color: #d13030; border-bottom: 2px solid #eaeaea; padding-bottom: 10px;">Omoshiroi Japan: Examination Report</h2>
            <p>A new examination has been submitted via the test platform.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="background-color: #f7f7f7;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Field</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Details</th>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Name / Romaji</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Password Key</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${password || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Level</td>
                <td style="padding: 10px; border: 1px solid #ddd;">JLPT ${level}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Final Score</td>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${score}%</td>
              </tr>
            </table>

            ${cheatProfile ? `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="background-color: #f7f7f7;">
                <th colspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #d13030;">
                  Security Report - Risk Level: <span style="color: ${cheatProfile.score >= 6 ? 'red' : cheatProfile.score >= 3 ? 'orange' : 'green'}">
                    ${cheatProfile.score >= 6 ? 'High Risk' : cheatProfile.score >= 3 ? 'Suspicious' : 'Safe'}
                  </span>
                </th>
              </tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Tab Switches</td><td style="padding: 8px; border: 1px solid #ddd;">${cheatProfile.tabSwitches}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Copy Attempts</td><td style="padding: 8px; border: 1px solid #ddd;">${cheatProfile.copyAttempts}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Screenshot Attempts</td><td style="padding: 8px; border: 1px solid #ddd;">${cheatProfile.screenshotAttempts}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">DevTools Attempts</td><td style="padding: 8px; border: 1px solid #ddd;">${cheatProfile.devToolsAttempts}</td></tr>
            </table>
            ` : ''}
            <h3 style="margin-top: 30px;">Correctly Answered Questions:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr style="background-color: #f1f1f1;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Question ID</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Status</th>
              </tr>
              ${answerRows}
            </table>
            
            <p style="font-size: 12px; color: #777;">System Generated Mail by Cloudflare Worker</p>
          </div>
        `;
  
        // Generic Email Provider Abstraction (e.g. Resend, SendGrid)
        // If ENV variables aren't set, we log it and return mock success.
        
        let providerResponseText = "Simulated delivery. Provide API Keys in Dashboard.";
  
        if (env.EMAIL_PROVIDER_API_KEY && env.EMAIL_PROVIDER_URL) {
            /* 
              Example API Adapter (SendGrid Format)
              This can be adjusted seamlessly from the Dashboard without touching logic.
            */
            const apiRequest = await fetch(env.EMAIL_PROVIDER_URL, {
                method: "POST",
                headers: {
                    "Authorization": \`Bearer \${env.EMAIL_PROVIDER_API_KEY}\`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: DESTINATION_EMAIL }] }],
                    from: { email: SENDER_EMAIL, name: "Omoshiroi Admin" },
                    subject: \`JLPT \${level} Test Submission - \${name}\`,
                    content: [{ type: "text/html", value: emailHtml }]
                })
            });
            
            if (!apiRequest.ok) {
                const errTxt = await apiRequest.text();
                throw new Error("Email Provider failed: " + errTxt);
            }
            providerResponseText = "Email delivered via upstream provider.";
        } else {
            // Mock logging mode during development
            console.log("Mock Email Dispatch:", emailHtml);
        }
  
        // Respond successful redirection or JSON
        if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
           // Provide a friendly valid response (Usually redirect backward or show success page)
           return new Response("<html><body><h2>Success! Delivery processed.</h2><a href='/dashboard.html'>Return here</a></body></html>", {
              status: 200,
              headers: { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" }
           });
        }
  
        return new Response(JSON.stringify({ success: true, message: providerResponseText }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
  
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
  };
