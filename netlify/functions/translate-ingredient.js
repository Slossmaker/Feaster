const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  const q = (event.queryStringParameters && event.queryStringParameters.q) || "";
  if (!q) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing q" })
    };
  }

  if (!OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing OPENAI_API_KEY env var" })
    };
  }

  try {
    const prompt = `
You are a helper for a recipe app.

User writes an ingredient string (maybe with language mix, plurals, adjectives, etc).
Your task:
1. Decide a short canonical base name in English (e.g. "tomato", "parmesan", "zucchini").
2. Provide translations for:
   - English (en)
   - Italian (it)
   - French (fr)

Return ONLY a JSON object like:
{
  "base": "tomato",
  "en": "Tomato",
  "it": "Pomodoro",
  "fr": "Tomate"
}

Input: "${q}"
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("OpenAI error:", txt);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "OpenAI API error" })
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        base: q,
        en: q,
        it: q,
        fr: q
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        base: parsed.base || q,
        en: parsed.en || q,
        it: parsed.it || q,
        fr: parsed.fr || q
      })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" })
    };
  }
};
