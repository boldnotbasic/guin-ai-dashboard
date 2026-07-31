// Pokémon Card AI Value Scanner
// Uses OpenAI GPT-4 Vision to analyze card images and estimate market value

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, set_name, card_number, condition, image_url } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Build prompt for AI
    let prompt = `You are a Pokémon Trading Card Game expert and market analyst. Analyze the following card and provide a current market value estimate in EUR.

Card Details:
- Title: ${title}
${set_name ? `- Set: ${set_name}` : ''}
${card_number ? `- Card Number: ${card_number}` : ''}
${condition ? `- Condition: ${condition}` : ''}

Please provide:
1. Estimated current market value in EUR (single number)
2. Confidence level (0.0 to 1.0)
3. Brief explanation of the valuation

Consider:
- Recent sales data and market trends
- Card rarity and desirability
- Condition impact on value
- Current Pokémon TCG market conditions

Respond in JSON format:
{
  "estimated_value": <number in EUR>,
  "confidence": <0.0 to 1.0>,
  "notes": "<brief explanation>"
}`;

    // Prepare API request
    const messages = [
      {
        role: 'system',
        content: 'You are a Pokémon TCG market expert. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: image_url ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image_url } }
        ] : prompt
      }
    ];

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: image_url ? 'gpt-4-vision-preview' : 'gpt-4-turbo-preview',
        messages: messages,
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error('OpenAI API request failed');
    }

    const aiResult = await openaiResponse.json();
    const content = aiResult.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    let result;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback: try to extract numbers from text
      const valueMatch = content.match(/(\d+\.?\d*)\s*EUR/i);
      const confidenceMatch = content.match(/confidence[:\s]+(\d+\.?\d*)/i);
      
      result = {
        estimated_value: valueMatch ? parseFloat(valueMatch[1]) : 0,
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
        notes: content.substring(0, 200)
      };
    }

    // Validate result
    if (typeof result.estimated_value !== 'number' || result.estimated_value < 0) {
      result.estimated_value = 0;
    }
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.5;
    }

    return res.status(200).json({
      estimated_value: Math.round(result.estimated_value * 100) / 100,
      confidence: Math.round(result.confidence * 100) / 100,
      notes: result.notes || 'AI analysis completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Pokémon scan error:', error);
    return res.status(500).json({ 
      error: 'Failed to scan card',
      message: error.message 
    });
  }
};
