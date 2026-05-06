import https from 'https';

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
- The FIRST entry of the day must preserve whatever timestamp the investigator wrote - do NOT change it to 00:00:00 unless it already says 00:00:00. The camera is not always deployed at midnight.
- The LAST entry of the day must preserve whatever timestamp the investigator wrote - do NOT change it to 23:59:59 unless it already says 23:59:59.
- Camera pause: Surveillance paused due to battery change.
- Technical glitch: Due to a technical error, video was interrupted to resume at HH:MM:SS.

PEOPLE:
- Unknown adults: UI Male, UI Female, UI Individual
- PRESERVE existing UI numbering exactly as written - do NOT renumber or reassign UI numbers
- If a numbered UI (e.g. UI Male 1) appears without a prior introduction line, flag it and suggest adding: "This individual will be referred to as UI Male 1 for the remainder of the report."
- UI children are referred to as UI Male Child or UI Female Child - they are NOT numbered unless there are more than 3 UI children, in which case number them: UI Male Child 1, UI Male Child 2, etc.
- Only use the claimant when identity is confirmed on camera
- "missionary" or "salesperson" are acceptable descriptions for unknown individuals who appear to be going door to door or canvassing the neighborhood and are unrelated to the subject

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

function httpsPost(hostname, path, apiKey, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const options = {
      hostname: hostname,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': body.length
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Could not parse API response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function callClaude(system, user, apiKey) {
  const data = await httpsPost(
    'api.anthropic.com',
    '/v1/messages',
    apiKey,
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      system: system,
      messages: [{ role: 'user', content: user }]
    }
  );
  if (data.error) throw new Error(data.error.message || 'Anthropic API error');
  const text = data.content?.[0]?.text || '';
  if (!text) throw new Error('Empty response from AI');
  return text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { dayText } = req.body;
  if (!dayText) return res.status(400).json({ error: 'No log text provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const cleanedLog = await callClaude(
      QC_PROMPT,
      'Return ONLY the fully corrected activity log as plain text. No commentary, no labels, just the corrected log starting with the header block.\n\nLog to QC:\n\n' + dayText,
      apiKey
    );

    const flagsRaw = await callClaude(
      QC_PROMPT,
      'You just QC\'d this surveillance log. Return ONLY a JSON array of issues and corrections. Format: [{"type":"error|warning|info","text":"description"}]. Return only the array, nothing else.\n\nLog:\n\n' + dayText,
      apiKey
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
