const QC_PROMPT = `You are a Quality Control editor for a private investigation agency specializing in remote surveillance activity logs. You will receive a SINGLE DAY of a surveillance report and must QC it thoroughly.

REPORT STRUCTURE — the day has this header block followed by entries:
Date of Surveillance: MM/DD/YYYY
Total Video: HH:MM:SS
Claimant Video: HH:MM:SS
Injuries: [list of injuries/restrictions]
Investigator: [name]
QC: [name]

ENTRY FORMAT RULES:
- Every entry: HH:MM:SS – [Description ending with a period.]
- Use an en dash (–) not a hyphen (-) between timestamp and text
- All entries must be past tense and third person
- One event per entry — split combined events if needed
- Consolidate overly wordy entries without losing factual detail
- Every day starts with: 00:00:00 – Surveillance was initiated.
- Every day ends with: 23:59:59 – Surveillance ended for the day.
- Exception: deployment/recovery days may differ — preserve those times as-is
- Camera pause: "Surveillance paused due to battery change."
- Technical glitch: "Due to a technical error, video was interrupted to resume at HH:MM:SS."

PEOPLE:
- Unknown individuals: UI Male, UI Female, UI Individual
- Number repeated unknowns: UI Male 1, UI Male 2 etc.
- First mention of a numbered UI: "This individual will be referred to as UI Male 1 for the remainder of the report."
- Only use "the claimant" when identity is confirmed on camera
- Never assume or guess identity

VEHICLES:
- Always include: color + type (SUV, sedan, pickup truck) + make/model if visible
- Low light: "Due to low lighting, the make/model and occupants could not be determined."
- Inside garage: "Identity could not be determined due to the vehicle being parked inside the garage."
- Obstructed: "Due to an obstructed view, occupants could not be identified."

CLAIMANT VIDEO:
- Confirmed claimant entries end with: (VIDEO OBTAINED)
- Describe physical activity in detail: bending, lifting, carrying, stooping, reaching, pushing, pulling, getting in/out of vehicles
- Never say an action violates restrictions — describe movements neutrally only
- Never use: "appeared to be in pain," "violated restrictions," "should not be doing this"

STANDARD APPROVED PHRASES:
- "conducted unknown activities"
- "departed the area as the sole occupant"
- "Occupants could not be determined."
- "retreated indoors" / "walked out of view"

WHAT TO FIX:
- Grammar, spelling, punctuation
- Hyphen to en dash in all timestamps
- Inconsistent UI numbering
- Missing start/end entries
- Missing periods at end of entries
- Non-neutral or interpretive language
- Run-on entries that should be split
- Missing "Occupants could not be determined." where appropriate
- Do NOT invent details or change facts`;

async function callGemini(prompt, apiKey, jsonMode) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    }
  };
  if (jsonMode) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Gemini API error');
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Empty response from AI');
  return text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { dayText } = req.body;
  if (!dayText) return res.status(400).json({ error: 'No log text provided' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    // Call 1: Get the cleaned log as plain text only
    const cleanedLog = await callGemini(
      `${QC_PROMPT}\n\nReturn ONLY the fully corrected activity log as plain text. Do not include any commentary, labels, or explanation — just the corrected log starting with the header block.\n\nLog to QC:\n\n${dayText}`,
      apiKey,
      false
    );

    // Call 2: Get flags as JSON only
    const flagsRaw = await callGemini(
      `${QC_PROMPT}\n\nYou have just QC'd this surveillance log. Now return ONLY a JSON array of issues and corrections you made. Each item: {"type":"error|warning|info","text":"description"}. Return only the JSON array, nothing else.\n\nLog that was QC'd:\n\n${dayText}`,
      apiKey,
      true
    );

    let flags = [];
    try {
      const match = flagsRaw.match(/\[[\s\S]*\]/);
      if (match) flags = JSON.parse(match[0]);
    } catch (e) {
      flags = [{ type: 'info', text: 'Could not parse flags for this day.' }];
    }

    return res.status(200).json({ cleaned_log: cleanedLog.trim(), flags });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}
