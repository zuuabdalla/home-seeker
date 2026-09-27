const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const GeminiService = {
  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  },

  async callGemini(prompt, systemInstruction = '') {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const contents = [];
      if (systemInstruction) {
        contents.push({
          role: 'user',
          parts: [{ text: `System context: ${systemInstruction}\n\nTask: ${prompt}` }]
        });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: prompt }]
        });
      }

      const response = await axios.post(
        url,
        {
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 12000
        }
      );

      const candidates = response.data?.candidates;
      if (candidates && candidates.length > 0) {
        return candidates[0].content.parts[0].text;
      }
      return null;
    } catch (error) {
      console.warn('Gemini API call failed, falling back to rule-based engine:', error.response?.data?.error?.message || error.message);
      return null;
    }
  },

  async generateDescription(propertyData) {
    const prompt = `Write an engaging, professional, and SEO-friendly Kenyan real estate description for the following property:
Title: ${propertyData.title}
Property Type: ${propertyData.property_type}
Listing Type: ${propertyData.listing_type || 'Rent'}
Location: ${propertyData.town}, ${propertyData.county} (${propertyData.estate || ''})
Price: KES ${propertyData.price}
Bedrooms: ${propertyData.bedrooms}, Bathrooms: ${propertyData.bathrooms}
Amenities: ${(propertyData.amenities || []).join(', ')}
House Rules / Info: ${propertyData.house_rules || ''}

Write 2-3 engaging paragraphs highlighting security, accessibility, natural light, and lifestyle benefits in Kenya.`;

    const aiResult = await this.callGemini(prompt, 'You are an elite Kenyan property marketing consultant.');
    if (aiResult) return aiResult.trim();

    // Fallback description generator
    return `Welcome to this remarkable ${propertyData.property_type || 'property'} located in the prime neighborhood of ${propertyData.town || 'Nairobi'}, ${propertyData.county || 'Kenya'}. Offering ${propertyData.bedrooms || 2} spacious bedrooms and ${propertyData.bathrooms || 2} modern bathrooms, this home combines comfortable urban living with convenience and tranquility.

The property enjoys seamless accessibility to major transit corridors, reputable learning institutions, and shopping destinations. Inside, you will appreciate generous natural lighting, well-ventilated living areas, and high-quality fixtures throughout.

With top-tier security, steady utility supplies, and ample parking, this residence provides peace of mind. Available immediately for rent at KES ${Number(propertyData.price || 0).toLocaleString('en-KE')} per month. Contact us today to schedule your private viewing!`;
  },

  async analyzeSuspiciousListing(property) {
    const prompt = `Analyze this Kenyan rental listing for potential fraud or red flags:
Title: ${property.title}
Price: KES ${property.price}
Location: ${property.town}, ${property.county}
Type: ${property.property_type}
Description: ${property.description}
Number of reports: ${property.report_count || 0}

Evaluate if the price is unrealistically low for this Kenyan area, if description has scam indicators, and provide a risk assessment (Low, Medium, High).`;

    const aiResult = await this.callGemini(prompt, 'You are a Kenyan fraud detection and cyber-threat analyst for real estate.');
    if (aiResult) return aiResult.trim();

    // Heuristic analysis fallback
    let score = 'Low';
    let reasons = [];

    const price = Number(property.price || 0);
    const town = String(property.town || '').toLowerCase();

    if (town.includes('westlands') || town.includes('karen') || town.includes('kilimani') || town.includes('lavington')) {
      if (price > 0 && price < 15000 && property.property_type !== 'bedsitter') {
        score = 'High';
        reasons.push('Price is drastically below average market rates for prime Nairobi areas.');
      }
    }

    if (property.report_count >= 2) {
      score = 'High';
      reasons.push(`Listing has received ${property.report_count} user reports from the community.`);
    }

    return `Risk Level: ${score}. ${reasons.length > 0 ? reasons.join(' ') : 'No obvious anomalies detected. Verify physical landlord identity before making deposits.'}`;
  },

  async estimatePrice({ county, town, property_type, bedrooms, bathrooms }) {
    const prompt = `Provide an estimated fair market monthly rent in Kenya Shillings (KES) for:
Location: ${town}, ${county}, Kenya
Type: ${property_type}
Bedrooms: ${bedrooms}
Bathrooms: ${bathrooms}

Give an estimated price range and average in JSON format: {"min": number, "max": number, "average": number, "explanation": "string"}`;

    const aiResult = await this.callGemini(prompt);
    if (aiResult) {
      try {
        const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Fallback to heuristic
      }
    }

    // Kenyan rental market baseline estimates
    let base = 25000;
    const t = String(town || '').toLowerCase();
    const isPrime = t.includes('westlands') || t.includes('karen') || t.includes('kilimani') || t.includes('lavington') || t.includes('nyali');
    if (isPrime) base = 60000;

    const beds = Number(bedrooms || 1);
    const estAverage = Math.round(base * (beds <= 1 ? 0.8 : beds * 0.9));
    return {
      min: Math.round(estAverage * 0.85),
      max: Math.round(estAverage * 1.25),
      average: estAverage,
      explanation: `Estimated based on historical rental trends in ${town || county || 'Kenya'}.`
    };
  },

  async chatAssistant(message, history = []) {
    const systemPrompt = `You are "HomeFinder Simba", the friendly and knowledgeable Kenyan AI housing assistant.
You help Kenyans and expats find houses, understand rent in areas like Westlands, Roysambu, Kilimani, Mombasa Nyali, Nakuru, Kisumu,
advise them on house hunting safely (e.g., never send viewing fee deposits before visiting!), and guide them around the HomeFinder platform.
Keep your answers warm, concise, and helpful.`;

    const aiResult = await this.callGemini(message, systemPrompt);
    if (aiResult) return aiResult.trim();

    // Fallback chatbot answers
    const lower = message.toLowerCase();
    if (lower.includes('deposit') || lower.includes('scam') || lower.includes('safe')) {
      return 'Security tip: Never pay any "viewing fee" or deposit via M-Pesa before meeting the landlord/agent in person and verifying the physical premises. On HomeFinder, verified listings are reviewed by our moderation team for your safety!';
    }
    if (lower.includes('westlands') || lower.includes('nairobi')) {
      return 'Westlands has vibrant apartments ranging from KES 45,000 for 1-bedroom units to KES 85,000+ for executive 2-bedroom flats with amenities like backup generators and elevators. Check our Properties page to filter by Westlands!';
    }
    if (lower.includes('roysambu') || lower.includes('trm') || lower.includes('bedsitter')) {
      return 'Roysambu and TRM Drive are popular for affordable bedsitters and 1-bedroom units ranging between KES 10,000 to KES 20,000. Water reliability and security are important features to check on each listing!';
    }
    return 'Karibu HomeFinder! You can search hundreds of verified rental houses and properties for sale across Nairobi, Mombasa, Kisumu, Nakuru, and Eldoret without needing an account. Let me know what location or budget you are looking for!';
  }
};

module.exports = GeminiService;
