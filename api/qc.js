const QC_PROMPT = `You are a Quality Control editor for a private investigation agency specializing in remote surveillance activity logs. You will receive a SINGLE DAY of a surveillance report and must QC it thoroughly.

REPORT STRUCTURE:
Date of Surveillance: MM/DD/YYYY
Total Video: HH:MM:SS
Claimant Video: HH:MM:SS
Injuries: [list of injuries/restrictions]
Investigator: [name]
QC: [name]

ENTRY FORMAT RULES:
- Every entry: HH:MM:SS - [Description ending with a period.]
- All entries must be past tense and third person
- One event per entry
- Every day starts with: 00:00:00 - Surveillance was initiated.
- Every day ends with: 23:59:59 - Surveillance ended for the day.
- Camera pause: Surveillance paused due to battery change.
- Technical glitch: Due to a technical error, video was interrupted to resume at HH:MM:SS.

PEOPLE:
- Unknown individuals: UI Male, UI Female, UI Individual
- Number repeated unknowns: UI Male 1, UI Male 2 etc.
- First mention of a numbered UI: This individual will be referred to as UI Male 1 for the remainder of the report.
- Only use the claimant when identity is confirmed on camera

VEHICLES:
- Always include: color, type, make/model if visible
- Low light: Due to low lighting, the make/model and occupants could not be determined.
- Inside garage: Identity could not be determined due to the vehicle being parked inside the garage.

CLAIMANT VIDEO:
- Confirmed claimant entries end with: (VIDEO OBTAINED)
- Describe physical activity in detail: bending, lifting, carrying, stooping, reaching, pushing, pulling
- Never say an action violates restrictions

STANDARD PHRASES:
- conducted unknown activities
- departed the area as the sole occupant
- Occupants could not be determined.
- retreated indoors / walked out of view

WHAT TO FIX:
- Grammar, spelling, punctuation
- Inconsistent UI numbering
- Missing start/end entries
- Missing periods at end of entries
- Non-neutral language
- Do NOT invent details or change facts`;

// Escape ALL non-ASCII characters so the JSON body is pure ASCII
function safeJSON(obj) {
  return JSON.stringify(obj).replace(/[\u0080-\uffff]/g, function(c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}

async function callGroq(system, user, apiKey) {
  const body = safeJSON({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 8000,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user   }
    ]
  });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey
    },
    body: body
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Groq API error");
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Empty response from AI");
  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { dayText } = req.body;
  if (!dayText) return res.status(400).json({ error: "No log text provided" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const cleanedLog = await callGroq(
      QC_PROMPT,
      "Return ONLY the fully corrected activity log as plain text. No commentary, no labels, just the corrected log starting with the header block.\n\nLog to QC:\n\n" + dayText,
      apiKey
    );

    const flagsRaw = await callGroq(
      QC_PROMPT,
      "You just QC'd this surveillance log. Return ONLY a JSON array of issues and corrections. Format: [{\"type\":\"error|warning|info\",\"text\":\"description\"}]. Return only the array, nothing else.\n\nLog:\n\n" + dayText,
      apiKey
    );

    let flags = [];
    try {
      const match = flagsRaw.match(/\[[\s\S]*\]/);
      if (match) flags = JSON.parse(match[0]);
    } catch (e) {
      flags = [{ type: "info", text: "Could not parse flags for this day." }];
    }

    return res.status(200).json({ cleaned_log: cleanedLog.trim(), flags });

  } catch (err) {
    return res.status(500).json({ error: err.message || "Something went wrong" });
  }
}
